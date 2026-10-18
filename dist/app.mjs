import {createMarketBriefing} from './market-briefing.mjs?v=20261018-visual';
import {attachInspector} from './chart-inspector.mjs?v=20261011-interactive';
import {refreshCadence,formatMinutes} from './refresh-cadence.mjs';
import {fetchJson,validateLatest,validateHistory,validateModel,mergeLatest} from './reliability.mjs?v=20261018-sources';
import {renderLab,renderPulse} from './lab.mjs?v=20261012-audit';
import {slugs,parties,sources,names,tickers,parseEvent,pct,markdown,isStale,consensus,marketGapDescription} from './data-core.mjs?v=20261018-sources';
import {forecastExpired} from './forecast-view.mjs';
let data={sources:{},errors:{}},model,history;
const liveFailures={},fileFailures={};
let lastCheck,cacheAvailable=true;
const validators={latest:validateLatest,model:validateModel,history:validateHistory};
function cache(key,value){try{localStorage.setItem('congress-cache-'+key,JSON.stringify(value));}catch{cacheAvailable=false;}}
for(const key of Object.keys(validators)){try{const raw=localStorage.getItem('congress-cache-'+key);if(!raw||raw.length>2000000)continue;const value=validators[key](JSON.parse(raw));if(key==='latest')data=value;else if(key==='model')model=value;else history=value;}catch{}}
const date=t=>new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
const shortDate=t=>new Date(t*1000).toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'});
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const renderBriefing=createMarketBriefing(document.getElementById('market-briefing'));
function render(){
 const selected=document.getElementById('source').value;
 for(const chamber of Object.keys(slugs)){
  const card=document.getElementById(chamber),avg=consensus(data,chamber),c=selected==='consensus'?avg:data.sources[selected]?.[chamber];
  for(const party of parties){const number=card.querySelector(`[data-party="${party}"]`);number.replaceChildren(document.createTextNode(c?(c.parties[party].probability*100).toFixed(1):'—'));if(c)number.append(el('span','%'));card.querySelector(`[data-bar="${party}"]`).style.width=c?pct(c.parties[party].probability):'0%';}
  const status=card.querySelector('.status');const stale=selected!=='consensus'&&isStale(c);const closed=c&&parties.some(p=>c.parties[p].closed);
  status.textContent=!c?'Unavailable':selected==='consensus'?`${c.included.length} sources`:closed?'Market closed':stale?'Stale data':'Recent retrieval';status.classList.toggle('stale',!c||stale||closed);
  card.querySelector('.card-subtitle').textContent=selected==='consensus'?'Equal-weight cash-market average':`${names[selected]} · ${selected==='manifold'?'play-money probabilities':'market-implied chance'}`;
  card.querySelector('.outlook').textContent=!c?'No eligible data for this view':marketGapDescription(c.parties.democratic.probability,c.parties.republican.probability);
  card.querySelector('.retrieved').textContent=!c?'No current snapshot':selected==='consensus'?`Includes ${c.included.map(x=>x.source).join(' + ')}`:`Retrieved ${date(c.fetchedAt)}`;
  card.querySelector('.source-time').textContent=selected==='consensus'?'Open sources retrieved within the last 2 hours':c?.priceMethod??'';
  const link=card.querySelector('.card-bottom a');link.href=selected==='consensus'?'#comparison':c?.url??'#comparison';link.textContent=selected==='consensus'?'Compare sources':'View market';link.target=selected==='consensus'?'_self':'_blank';
  card.querySelector('.notice').textContent=!c?'No snapshot available. Check the comparison below for source status.':stale?'Snapshot is over 2 hours old. Check the source for current prices.':selected==='manifold'?'Community play-money markets · separate Yes contracts with different settlement rules. Comparison only; excluded from the cash-market average.':'';
 }
 const tbody=document.getElementById('source-rows');tbody.replaceChildren();
 for(const chamber of Object.keys(slugs))for(const source of sources){
  const c=data.sources[source]?.[chamber],tr=el('tr'),name=el('td');name.append(el('small',chamber==='house'?'HOUSE':'SENATE'));
  if(c){const a=el('a',names[source]+' ↗');a.href=c.url;a.target='_blank';a.rel='noopener noreferrer';name.append(a);}else name.append(el('span',names[source]));tr.append(name);
  for(const party of parties){const cell=el('td',undefined,party==='democratic'?'blue':'red');if(c&&source==='manifold'){const a=el('a',pct(c.parties[party].probability)+' ↗');a.href=c.parties[party].url;a.target='_blank';a.rel='noopener noreferrer';a.style.color='inherit';cell.append(a);}else cell.textContent=c?pct(c.parties[party].probability):'—';tr.append(cell);}
  tr.append(el('td',c?.priceMethod??'Unavailable'));
  const status=el('td',c?date(c.fetchedAt):(data.errors?.[`${source}/${chamber}`]?'Retrieval failed · retry scheduled':'Awaiting source snapshot'));
  if(c){const closed=parties.some(p=>c.parties[p].closed);status.append(el('small',closed?'Closed · excluded':isStale(c)?'Stale · excluded':source==='manifold'?'Play money · comparison only':'Eligible for cash-market average',closed||isStale(c)?'source-error':''));if(data.errors?.[`${source}/${chamber}`]||liveFailures[`${source}/${chamber}`])status.append(el('small','Latest request failed · retained snapshot','source-error'));}
  tr.append(status);tbody.append(tr);
 }
 document.getElementById('copy').disabled=!Object.keys(data.sources).length;
 renderBriefing(data,liveFailures);renderModel();renderHistory();renderPulse(data,history,consensus);renderHealth();
}
function renderModel(){
 const status=document.getElementById('model-status'),cards=document.getElementById('model-cards'),rows=document.getElementById('model-rows');cards.replaceChildren();rows.replaceChildren();
 if(!model?.series){status.textContent='Model unavailable. Market data remains available above.';status.classList.remove('warning');return;}
 const expired=Object.values(model.series).some(m=>forecastExpired(m.forecastFor));
 status.textContent=`Trained ${date(model.trainedAt)} · ${expired?'Forecast horizon has passed; awaiting daily retraining.':'Forecasts use the latest completed daily candles.'}`;status.classList.toggle('warning',expired);
 for(const chamber of Object.keys(slugs)){
  const card=el('article',undefined,'model-card');card.append(el('h3',chamber==='house'?'House · next daily close':'Senate · next daily close'));
  const odds=el('div',undefined,'odds');const current=[];
  for(const [party,suffix] of [['democratic','D'],['republican','R']]){
   const m=model.series[`${tickers[chamber]}-2026-${suffix}`];if(!m)continue;current.push(m);
   const block=el('div');block.append(el('span',party==='democratic'?'Democrats':'Republicans','party-label'),el('p',pct(m.forecast),`number ${party==='democratic'?'blue':'red'}`),el('span',`Last close ${pct(m.lastClose)}`,'fine'),el('small',m.benchmarks?.[m.selectedModel]?.name??'Ridge','method-chip'));odds.append(block);
   const tr=el('tr');for(const value of [`${chamber==='house'?'House':'Senate'} · ${suffix}`,`${m.maePP.toFixed(2)} pp`,`${m.baselineMaePP.toFixed(2)} pp`,m.testDays,m.trainingExamples])tr.append(el('td',String(value)));rows.append(tr);
  }
  card.append(odds);if(current.length){const m=current[0];card.append(el('p',`Target: ${date(m.forecastFor)} · Data through ${date(m.dataThrough)}`,'fine'));if(current.some(item=>forecastExpired(item.forecastFor)))card.append(el('p','Forecast target passed · shown for historical reference, not a current next-day forecast.','fine forecast-expired'));
   const wins=current.filter(m=>m.maePP<m.baselineMaePP).length;
   card.append(el('p',wins===2?'Lower backtest error than no-change for both contracts.':wins===0?'No improvement over no-change for these selected forecasts.':'Mixed backtest results: only one contract beat no-change.','model-result'));
  }cards.append(card);
 }
 renderLab(model);
}
function renderHistory(){
 const box=document.getElementById('history-chart');box.replaceChildren();if(!history?.series){box.append(el('p','History unavailable.','fine'));document.getElementById('history-caption').textContent='No validated history snapshot is available.';return;}
 const chamber=document.getElementById('history-chamber').value,days=Number(document.getElementById('history-days').value),series=['D','R'].map(p=>history.series[`${tickers[chamber]}-2026-${p}`]??[]);
 const end=Math.max(...series.flat().map(p=>p.t)),start=end-(days-1)*86400;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 270');
 const add=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);return e;};
 for(const p of [0,.25,.5,.75,1]){const y=225-p*195;add('line',{x1:48,x2:973,y1:y,y2:y,stroke:'var(--line)'});add('text',{x:39,y:y+4,fill:'var(--muted)','font-size':12,'text-anchor':'end'},`${p*100}%`);}
 series.forEach((all,index)=>{const points=all.filter(p=>p.t>=start);let path='';for(let i=0;i<points.length;i++){const p=points[i],gap=i===0||p.t-points[i-1].t>90000;path+=`${gap?'M':'L'}${48+(p.t-start)/(end-start)*925},${225-p.p*195} `;}add('path',{d:path,fill:'none',stroke:index?'var(--red)':'var(--blue)','stroke-width':3});});
 for(const [x,t,anchor]of [[48,start,'start'],[510,(start+end)/2,'middle'],[973,end,'end']])add('text',{x,y:253,fill:'var(--muted)','font-size':12,'text-anchor':anchor},shortDate(t));
 box.append(svg);
 const byDate=series.map(all=>new Map(all.map(p=>[p.t,p.p])));
 const dates=[...new Set(series.flat().filter(p=>p.t>=start).map(p=>p.t))].sort((a,b)=>a-b);
 if(dates.length<2)box.append(el('p','Only one or no daily observations fall within this range. Choose a longer window to compare trends.','fine chart-gap-notice'));
 attachInspector(box,svg,dates.map(t=>({t,x:48+(t-start)/(end-start)*925,values:byDate.map((values,i)=>({label:i?'Republicans':'Democrats',value:values.has(t)?pct(values.get(t)):'No observation',tone:i?'red':'blue'}))})),{label:chamber+' price history',bottom:225});
 box.setAttribute('aria-label',`${chamber} Democratic and Republican daily market prices from ${shortDate(start)} to ${shortDate(end)}, 0 to 100 percent scale. Downloadable daily values linked below.`);
 const caption=document.getElementById('history-caption');const historyOld=Date.now()-Date.parse(history.fetchedAt)>26*3600000;caption.replaceChildren(document.createTextNode(`Daily history retrieved ${date(history.fetchedAt)}.${historyOld?' History snapshot is over 26 hours old; check the next data refresh.':''} `));const a=el('a','Download daily values');a.href='data/history.json';caption.append(a);
}
let busy=false;
function renderHealth(){
 const available=sources.reduce((n,s)=>n+Object.values(data.sources[s]||{}).filter(c=>!isStale(c)&&!parties.some(p=>c.parties[p].closed)).length,0);
 const expected=sources.length*Object.keys(slugs).length;
 const issues=Object.keys(fileFailures).filter(k=>fileFailures[k]);
 const liveError=Object.values(liveFailures).some(Boolean);
 const offline=navigator.onLine===false;
 const box=document.getElementById('data-health');
 box.classList.toggle('degraded',offline||available<expected||issues.length>0||liveError);
 box.textContent=`${offline?'Offline · ':''}${available}/${expected} recent, open market snapshots. Published updates scheduled ${formatMinutes(refreshCadence().publishMinutes)}; browser checks ${formatMinutes(refreshCadence().browserMinutes)}. ${lastCheck?'Last refresh check '+date(lastCheck)+'.':'Checking live sources…'} ${issues.length?'Could not update '+issues.join(', ')+'; retaining last valid data. ':''}${liveError?'Direct Polymarket refresh failed; saved snapshots remain visible. ':''}${!cacheAvailable?'Browser caching unavailable. ':''}Stale snapshots keep their original timestamps and are excluded from the average.`;
}
async function saved(){await Promise.all(Object.keys(validators).map(async key=>{
 try{
  const value=validators[key](await fetchJson(`./data/${key}.json`,{attempts:1}));
  if(key==='latest')data=mergeLatest(data,value);
  else if(key==='model'&&(!model||Date.parse(value.trainedAt)>=Date.parse(model.trainedAt)))model=value;
  else if(key==='history'&&(!history||Date.parse(value.fetchedAt)>=Date.parse(history.fetchedAt)))history=value;
  fileFailures[key]=false;cache(key,key==='latest'?data:key==='model'?model:history);
 }catch{fileFailures[key]=true;}
}));}
async function live(){await Promise.all(Object.entries(slugs).map(async([chamber,slug])=>{
 try{
  const c=parseEvent(await fetchJson(`https://gamma-api.polymarket.com/events/slug/${slug}`),chamber);
  data=mergeLatest(data,{sources:{polymarket:{[chamber]:c}},errors:{}});liveFailures[`polymarket/${chamber}`]=false;
 }catch{liveFailures[`polymarket/${chamber}`]=true;}
}));}
async function refresh(manual=false){
 if(busy)return;busy=true;const button=document.getElementById('refresh');button.disabled=true;button.textContent='Refreshing…';
 try{await Promise.all([saved(),live()]);lastCheck=new Date().toISOString();if(Object.keys(data.sources).length)cache('latest',data);render();}
 catch{document.getElementById('data-health').textContent='Refresh could not finish. Your last valid snapshots and scenarios are retained; try Refresh odds again.';}
 finally{button.disabled=false;button.textContent='↻ Refresh odds';busy=false;}
 if(manual)chime();
}
document.getElementById('refresh').addEventListener('click',()=>refresh(true));document.getElementById('source').addEventListener('change',render);for(const id of ['history-chamber','history-days'])document.getElementById(id).addEventListener('change',renderHistory);
document.getElementById('copy').addEventListener('click',async()=>{const text=markdown(data,model),status=document.getElementById('copy-status');try{await navigator.clipboard.writeText(text);status.textContent='Copied source comparisons and model results with timestamps.';}catch{const a=el('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/markdown'}));a.download='congress-odds-README.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);status.textContent='Downloaded README snapshot.';}});
let soundOn=false,audioContext;
function chime(){if(!soundOn||!audioContext)return;try{audioContext.resume();const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.frequency.value=660;gain.gain.setValueAtTime(.035,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.12);oscillator.start();oscillator.stop(audioContext.currentTime+.13);}catch{}}
document.getElementById('sound-toggle').addEventListener('click',()=>{try{if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();soundOn=!soundOn;const button=document.getElementById('sound-toggle');button.textContent=soundOn?'Sound on':'Sound off';button.setAttribute('aria-pressed',String(soundOn));chime();}catch{document.getElementById('sound-toggle').textContent='Sound unavailable';}});
for(const id of ['lab-contract','lab-model','lab-scale'])document.getElementById(id).addEventListener('change',()=>{renderLab(model);chime();});
function browserRefreshDue() {return !lastCheck || Date.now()-Date.parse(lastCheck)>=refreshCadence().browserMinutes*60000;}
function updateCadenceText() {
 const cadence=refreshCadence(),hint=document.getElementById('refresh-policy');
 if(hint)hint.textContent=`Published: ${formatMinutes(cadence.publishMinutes)} · Live Polymarket checks: ${formatMinutes(cadence.browserMinutes)}`;
}
updateCadenceText();render();refresh();
setInterval(()=>{if(!document.hidden&&browserRefreshDue())refresh();},30000);
setInterval(()=>{if(!document.hidden){updateCadenceText();render();}},60000);
window.addEventListener('online',()=>refresh());window.addEventListener('offline',renderHealth);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateCadenceText();if(browserRefreshDue())refresh();else render();}});

document.getElementById("race-simulator").addEventListener("click",event=>{if(event.target.closest("button,[data-state]"))chime();});
document.getElementById("race-simulator").addEventListener("change",event=>{if(event.target.matches("select"))chime();});
