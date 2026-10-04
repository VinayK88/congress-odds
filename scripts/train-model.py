"""Daily Kalshi midpoint forecasts. No election outcome labels are used."""
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
import json, time, urllib.request
import numpy as np
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

ROOT=Path(__file__).resolve().parent.parent
DATA=ROOT/'dist/data'
FEATURES=['level','change_1d','change_3d','change_7d','volatility_7d']

def iso(ts): return datetime.fromtimestamp(ts,timezone.utc).isoformat().replace('+00:00','Z')

def extract(payload, now):
    rows={}
    for c in payload.get('candlesticks',[]):
        try:
            ts=int(c['end_period_ts'])
            raw_bid=c['yes_bid']['close_dollars'];raw_ask=c['yes_ask']['close_dollars']
            if raw_bid is None or raw_ask is None: continue
            bid=float(raw_bid);ask=float(raw_ask)
            if not (0<bid<=ask<1) or ts>now: continue
            rows[ts]=(bid+ask)/2
        except (KeyError,TypeError,ValueError): continue
    return [{'t':t,'p':p} for t,p in sorted(rows.items())]

def features(values, i):
    return [values[i],values[i]-values[i-1],values[i]-values[i-3],values[i]-values[i-7],float(np.std(np.diff(values[i-7:i+1])))]

def continuous(rows, first, last):
    # Exchange daily boundaries can move by an hour for daylight saving time.
    return all(82800<=rows[j]['t']-rows[j-1]['t']<=90000 for j in range(first+1,last+1))

MODEL_NAMES={'baseline':'No change','ridge':'Ridge','forest':'Random forest','boost':'Gradient boosting','ensemble':'ML ensemble'}

def estimator(key='ridge'):
    if key=='ridge': return make_pipeline(StandardScaler(),Ridge(alpha=10.0))
    if key=='forest': return RandomForestRegressor(n_estimators=64,max_depth=4,min_samples_leaf=8,random_state=42,n_jobs=1)
    if key=='boost': return GradientBoostingRegressor(n_estimators=60,max_depth=2,learning_rate=.03,min_samples_leaf=8,random_state=42)
    raise ValueError(key)

def metrics(predictions, actual, baseline):
    errors=np.array(predictions)-actual
    movement=np.array(actual)-baseline
    nonflat=np.abs(movement)>1e-8
    return {'maePP':float(np.mean(np.abs(errors))*100),'rmsePP':float(np.sqrt(np.mean(errors**2))*100),
            'directionAccuracy':float(np.mean(np.sign(np.array(predictions)[nonflat]-np.array(baseline)[nonflat])==np.sign(movement[nonflat]))*100) if nonflat.any() else None,
            'directionDays':int(nonflat.sum())}

def fit(rows,chamber,party,ticker):
    values=np.array([r['p'] for r in rows]);X=[];y=[];indices=[]
    for i in range(7,len(rows)-1):
        if continuous(rows,i-7,i+1):
            X.append(features(values,i));y.append(values[i+1]-values[i]);indices.append(i)
    if len(X)<150 or not continuous(rows,len(rows)-8,len(rows)-1):
        raise ValueError(f'{ticker}: need 150 valid training examples and a contiguous final feature window')
    X=np.array(X);y=np.array(y);n=len(y);test_start=n-60;selection_start=test_start-30
    predictions={key:[] for key in MODEL_NAMES};actual=[];baseline=[]
    for k in range(selection_start,n):
        i=indices[k];origin=float(values[i]);baseline.append(origin);actual.append(float(values[i+1]))
        guesses={'baseline':origin}
        for key in ['ridge','forest','boost']:
            fitted=estimator(key).fit(X[:k],y[:k])
            guesses[key]=float(np.clip(origin+fitted.predict(X[k:k+1])[0],0,1))
        guesses['ensemble']=float(np.mean([guesses[key] for key in ['ridge','forest','boost']]))
        for key in predictions: predictions[key].append(guesses[key])
    validation={key:float(np.mean(np.abs(np.array(p[:30])-actual[:30]))*100) for key,p in predictions.items()}
    # Choose before seeing the 60-day test window. Baseline wins exact ties.
    selected=min(validation,key=validation.get)
    benchmarks={};importance=[]
    for key in MODEL_NAMES:
        if key=='baseline': forecast=float(values[-1])
        elif key=='ensemble': forecast=float(np.mean([benchmarks[k]['forecast'] for k in ['ridge','forest','boost']]))
        else:
            final=estimator(key).fit(X,y)
            forecast=float(np.clip(values[-1]+final.predict([features(values,len(values)-1)])[0],0,1))
            if key=='forest': importance=[{'feature':f,'importance':float(v)} for f,v in zip(FEATURES,final.feature_importances_)]
        backtest=[{'t':rows[indices[k]+1]['t'],'predicted':predictions[key][k-selection_start],
                   'actual':float(values[indices[k]+1]),'baseline':float(values[indices[k]]),'trainExamples':k} for k in range(test_start,n)]
        benchmarks[key]={'name':MODEL_NAMES[key],'forecast':forecast,'validationMaePP':validation[key],
                         **metrics(predictions[key][30:],actual[30:],baseline[30:]),'backtest':backtest}
    chosen=benchmarks[selected]
    return {'chamber':chamber,'party':party,'ticker':ticker,'forecast':chosen['forecast'],
            'forecastFor':iso(rows[-1]['t']+86400),'dataThrough':iso(rows[-1]['t']),
            'lastClose':float(values[-1]),'maePP':chosen['maePP'],'baselineMaePP':benchmarks['baseline']['maePP'],
            'testDays':60,'trainingExamples':n,'historyDays':len(rows),
            'testStart':iso(chosen['backtest'][0]['t']),'testEnd':iso(chosen['backtest'][-1]['t']),
            'selectedModel':selected,'selectionDays':30,'selectionStart':iso(rows[indices[selection_start]+1]['t']),
            'selectionEnd':iso(rows[indices[test_start-1]+1]['t']),
            'benchmarks':benchmarks,'featureImportance':importance,'backtest':chosen['backtest']}

def fetch_series(item,now):
    chamber,party,ticker=item;series=ticker.split('-')[0]
    url=f'https://api.elections.kalshi.com/trade-api/v2/series/{series}/markets/{ticker}/candlesticks?start_ts={now-365*86400}&end_ts={now}&period_interval=1440'
    last=None
    for _ in range(3):
        try:
            with urllib.request.urlopen(url,timeout=55) as response: payload=json.load(response)
            if payload.get('ticker')!=ticker: raise ValueError('Unexpected history ticker')
            rows=extract(payload,now)
            if not rows or now-rows[-1]['t']>36*3600: raise ValueError('Historical series is not current')
            return ticker,rows,fit(rows,chamber,party,ticker)
        except Exception as error: last=error
    raise last

def main():
    now=int(time.time());path=DATA/'model.json'
    if path.exists():
        prior=json.loads(path.read_text())
        if prior.get('schemaVersion')==2 and prior.get('series') and all(datetime.fromisoformat(v['forecastFor'].replace('Z','+00:00')).timestamp()>now for v in prior['series'].values()):
            print('Daily model forecasts still current; reusing completed training.');return
    items=[(c,p,f'{s}-2026-{suffix}') for c,s in [('house','CONTROLH'),('senate','CONTROLS')] for p,suffix in [('democratic','D'),('republican','R')]]
    with ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(lambda item:fetch_series(item,now),items))
    model={'schemaVersion':2,'trainedAt':iso(now),'algorithm':'Ridge, random forest, gradient boosting and equal-weight ML ensemble; validation selection includes no-change',
           'target':'Next daily Kalshi closing Yes bid/ask midpoint','features':FEATURES,
           'validation':'30 expanding-window validation days select one candidate, followed by 60 untouched test days; fixed hyperparameters. Models refit daily using available past labels.',
           'series':{ticker:m for ticker,rows,m in results}}
    history={'source':'Kalshi daily candlesticks, closing Yes bid/ask midpoint','fetchedAt':iso(now),'series':{ticker:rows for ticker,rows,m in results}}
    for name,data in [('history',history),('model',model)]:
        tmp=DATA/f'{name}.json.tmp';tmp.write_text(json.dumps(data,indent=2)+'\n');tmp.replace(DATA/f'{name}.json')
    for ticker,_,m in results: print(f"{ticker}: {m['trainingExamples']} examples; MAE {m['maePP']:.3f}pp, no-change {m['baselineMaePP']:.3f}pp")

if __name__=='__main__': main()
