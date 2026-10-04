"""Daily Kalshi midpoint forecasts. No election outcome labels are used."""
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
import json, time, urllib.request
import numpy as np
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge

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

def estimator(): return make_pipeline(StandardScaler(),Ridge(alpha=10.0))

def fit(rows,chamber,party,ticker):
    values=np.array([r['p'] for r in rows]);X=[];y=[];indices=[]
    for i in range(7,len(rows)-1):
        if continuous(rows,i-7,i+1):
            X.append(features(values,i));y.append(values[i+1]-values[i]);indices.append(i)
    if len(X)<120 or not continuous(rows,len(rows)-8,len(rows)-1):
        raise ValueError(f'{ticker}: insufficient contiguous history (need 120 training examples)')
    X=np.array(X);y=np.array(y);n=len(y);start=max(60,n-60)
    predicted=[];actual=[];baseline=[];backtest=[]
    for k in range(start,n):
        # Only labels already observed at this forecast origin are in training.
        model=estimator().fit(X[:k],y[:k]);i=indices[k]
        guess=float(np.clip(values[i]+model.predict(X[k:k+1])[0],0,1))
        predicted.append(guess);actual.append(float(values[i+1]));baseline.append(float(values[i]))
        backtest.append({'t':rows[i+1]['t'],'predicted':guess,'actual':float(values[i+1]),'baseline':float(values[i]),'trainExamples':k})
    final=estimator().fit(X,y)
    forecast=float(np.clip(values[-1]+final.predict([features(values,len(values)-1)])[0],0,1))
    mae=float(np.mean(np.abs(np.array(predicted)-actual))*100)
    baseline_mae=float(np.mean(np.abs(np.array(baseline)-actual))*100)
    return {'chamber':chamber,'party':party,'ticker':ticker,'forecast':forecast,
            'forecastFor':iso(rows[-1]['t']+86400),'dataThrough':iso(rows[-1]['t']),
            'lastClose':float(values[-1]),'maePP':mae,'baselineMaePP':baseline_mae,
            'testDays':len(backtest),'trainingExamples':n,'historyDays':len(rows),
            'testStart':iso(backtest[0]['t']),'testEnd':iso(backtest[-1]['t']),
            'coefficients':final.named_steps['ridge'].coef_.tolist(),
            'intercept':float(final.named_steps['ridge'].intercept_),
            'featureMeans':final.named_steps['standardscaler'].mean_.tolist(),
            'featureScales':final.named_steps['standardscaler'].scale_.tolist(),
            'backtest':backtest}

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
        if prior.get('series') and all(datetime.fromisoformat(v['forecastFor'].replace('Z','+00:00')).timestamp()>now for v in prior['series'].values()):
            print('Daily model forecasts still current; reusing completed training.');return
    items=[(c,p,f'{s}-2026-{suffix}') for c,s in [('house','CONTROLH'),('senate','CONTROLS')] for p,suffix in [('democratic','D'),('republican','R')]]
    with ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(lambda item:fetch_series(item,now),items))
    model={'schemaVersion':1,'trainedAt':iso(now),'algorithm':'StandardScaler + Ridge (alpha=10)',
           'target':'Next daily Kalshi closing Yes bid/ask midpoint','features':FEATURES,
           'validation':'Expanding-window one-step forecasts on the last 60 valid daily examples; fixed alpha, no random split.',
           'series':{ticker:m for ticker,rows,m in results}}
    history={'source':'Kalshi daily candlesticks, closing Yes bid/ask midpoint','fetchedAt':iso(now),'series':{ticker:rows for ticker,rows,m in results}}
    for name,data in [('history',history),('model',model)]:
        tmp=DATA/f'{name}.json.tmp';tmp.write_text(json.dumps(data,indent=2)+'\n');tmp.replace(DATA/f'{name}.json')
    for ticker,_,m in results: print(f"{ticker}: {m['trainingExamples']} examples; MAE {m['maePP']:.3f}pp, no-change {m['baselineMaePP']:.3f}pp")

if __name__=='__main__': main()
