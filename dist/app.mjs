import {renderLab,renderPulse} from './lab.mjs?v=20261004-lab';
import {slugs,parties,sources,names,tickers,parseEvent,pct,markdown,isStale,consensus} from './data-core.mjs?v=20261004-lab';
let data={sources:{},errors:{}},model,history;
const liveFailures={};
const date=t=>new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
const shortDate=t=>new Date(t*1000).toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'});
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
function render(){
 const selected=document.getElementById('source').value;
 for(const chamber of Object.keys(slugs)){
  const card=document.getElementById(chamber),avg=consensus(data,chamber),c=selected==='consensus'?avg:data.sources[selected]?.[chamber];
  for(const party of parties){const number=card.querySelector(`[data-party="${party}"]`);number.replaceChildren(document.createTextNode(c?(c.parties[party].probability*100).toFixed(1):'—'));if(c)number.append(el('span','%'));card.querySelector(`[data-bar="${party}"]`).style.width=c?pct(c.parties[party].probability):'0%';}
  const status=card.querySelector('.status');const stale=selected!=='consensus'&&isStale(c);const closed=c&&parties.some(p=>c.parties[p].closed);
  status.textContent=!c?'Unavailable':selected==='consensus'?`${c.included.length} sources`:closed?'Market closed':stale?'Stale data':'Recent fetch';status.classList.toggle('stale',!c||stale||closed);
  card.querySelector('.card-subtitle').textContent=selected==='consensus'?'Equal-weight market average':`${names[selected]} · market-implied chance`;
  const gap=c?(c.parties.democratic.probability-c.parties.republican.probability)*100:0;
  card.querySelector('.outlook').textContent=!c?'No eligible data for this view':`${gap>=0?'Democrats':'Republicans'} lead by ${Math.abs(gap).toFixed(1)} percentage points.`;
  card.querySelector('.retrieved').textContent=!c?'No current snapshot':selected==='consensus'?`Includes ${c.included.map(x=>x.source).join(' + ')}`:`Retrieved ${date(c.fetchedAt)}`;
  card.querySelector('.source-time').textContent=selected==='consensus'?'Open sources retrieved within the last 2 hours':c?.priceMethod??'';
  const link=card.querySelector('.card-bottom a');link.href=selected==='consensus'?'#comparison':c?.url??'#comparison';link.textContent=selected==='consensus'?'Compare sources':'View market';link.target=selected==='consensus'?'_self':'_blank';
  card.querySelector('.notice').textContent=!c?(selected==='predictit'&&chamber==='house'?'PredictIt has no direct House market configured. Use another source or the market average.':'No recent open sources available; older snapshots remain in the comparison below.'):stale?'Snapshot is over 2 hours old. Check the source for current prices.':'';
 }
 const tbody=document.getElementById('source-rows');tbody.replaceChildren();
 for(const chamber of Object.keys(slugs))for(const source of sources){
  const c=data.sources[source]?.[chamber],tr=el('tr'),name=el('td');name.append(el('small',chamber==='house'?'HOUSE':'SENATE'));
  if(c){const a=el('a',names[source]+' ↗');a.href=c.url;a.target='_blank';a.rel='noopener noreferrer';name.append(a);}else name.append(el('span',names[source]));tr.append(name);
  for(const party of parties)tr.append(el('td',c?pct(c.parties[party].probability):'—',party==='democratic'?'blue':'red'));
  tr.append(el('td',c?.priceMethod??(source==='predictit'&&chamber==='house'?'Not configured':'Unavailable')));
  const status=el('td',c?date(c.fetchedAt):(source==='predictit'&&chamber==='house'?'No direct House contract':'Source unavailable'));
  if(c){const closed=parties.some(p=>c.parties[p].closed);status.append(el('small',closed?'Closed · excluded':isStale(c)?'Stale · excluded':'Eligible for market average',closed||isStale(c)?'source-error':''));if(data.errors?.[`${source}/${chamber}`]||liveFailures[`${source}/${chamber}`])status.append(el('small','Latest request failed · retained snapshot','source-error'));}
  tr.append(status);tbody.append(tr);
 }
 document.getElementById('copy').disabled=!Object.keys(data.sources).length;
 renderModel();renderHistory();renderPulse(data,history,consensus);
}
function renderModel(){
 const status=document.getElementById('model-status'),cards=document.getElementById('model-cards'),rows=document.getElementById('model-rows');cards.replaceChildren();rows.replaceChildren();
 if(!model?.series){status.textContent='Model unavailable. Market data remains available above.';return;}
 const expired=Object.values(model.series).some(m=>Date.parse(m.forecastFor)<Date.now());
 status.textContent=`Trained ${date(model.trainedAt)} · ${expired?'Forecast horizon has passed; awaiting daily retraining.':'Forecasts use the latest completed daily candles.'}`;status.classList.toggle('warning',expired);
 for(const chamber of Object.keys(slugs)){
  const card=el('article',undefined,'model-card');card.append(el('h3',chamber==='house'?'House · next daily close':'Senate · next daily close'));
  const odds=el('div',undefined,'odds');const current=[];
  for(const [party,suffix] of [['democratic','D'],['republican','R']]){
   const m=model.series[`${tickers[chamber]}-2026-${suffix}`];if(!m)continue;current.push(m);
   const block=el('div');block.append(el('span',party==='democratic'?'Democrats':'Republicans','party-label'),el('p',pct(m.forecast),`number ${party==='democratic'?'blue':'red'}`),el('span',`Last close ${pct(m.lastClose)}`,'fine'),el('small',m.benchmarks?.[m.selectedModel]?.name??'Ridge','method-chip'));odds.append(block);
   const tr=el('tr');for(const value of [`${chamber==='house'?'House':'Senate'} · ${suffix}`,`${m.maePP.toFixed(2)} pp`,`${m.baselineMaePP.toFixed(2)} pp`,m.testDays,m.trainingExamples])tr.append(el('td',String(value)));rows.append(tr);
  }
  card.append(odds);if(current.length){const m=current[0];card.append(el('p',`Target: ${date(m.forecastFor)} · Data through ${date(m.dataThrough)}`,'fine'));
   const wins=current.filter(m=>m.maePP<m.baselineMaePP).length;
   card.append(el('p',wins===2?'Lower backtest error than no-change for both contracts.':wins===0?'No improvement over no-change for these selected forecasts.':'Mixed backtest results: only one contract beat no-change.','model-result'));
  }cards.append(card);
 }
 renderLab(model);
}
function renderHistory(){
 const box=document.getElementById('history-chart');box.replaceChildren();if(!history?.series){box.append(el('p','History unavailable.','fine'));return;}
 const chamber=document.getElementById('history-chamber').value,days=Number(document.getElementById('history-days').value),series=['D','R'].map(p=>history.series[`${tickers[chamber]}-2026-${p}`]??[]);
 const end=Math.max(...series.flat().map(p=>p.t)),start=end-(days-1)*86400;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 270');
 const add=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);return e;};
 for(const p of [0,.25,.5,.75,1]){const y=225-p*195;add('line',{x1:48,x2:973,y1:y,y2:y,stroke:'#29354b'});add('text',{x:39,y:y+4,fill:'#99a7be','font-size':12,'text-anchor':'end'},`${p*100}%`);}
 series.forEach((all,index)=>{const points=all.filter(p=>p.t>=start);let path='';for(let i=0;i<points.length;i++){const p=points[i],gap=i===0||p.t-points[i-1].t>90000;path+=`${gap?'M':'L'}${48+(p.t-start)/(end-start)*925},${225-p.p*195} `;}add('path',{d:path,fill:'none',stroke:index?'#ff8795':'#73a6ff','stroke-width':2.5});});
 for(const [x,t,anchor]of [[48,start,'start'],[510,(start+end)/2,'middle'],[973,end,'end']])add('text',{x,y:253,fill:'#99a7be','font-size':12,'text-anchor':anchor},shortDate(t));
 box.append(svg);box.setAttribute('aria-label',`${chamber} Democratic and Republican daily market prices from ${shortDate(start)} to ${shortDate(end)}, 0 to 100 percent scale. Downloadable daily values linked below.`);
 const caption=document.getElementById('history-caption');caption.replaceChildren(document.createTextNode(`Daily history retrieved ${date(history.fetchedAt)}. `));const a=el('a','Download daily values');a.href='data/history.json';caption.append(a);
}
let busy=false;
async function saved(){await Promise.all(['latest','model','history'].map(async key=>{try{const r=await fetch(`./data/${key}.json`,{cache:'no-store'});if(!r.ok)throw Error();const value=await r.json();if(key==='latest'&&value.schemaVersion===2)data=value;if(key==='model')model=value;if(key==='history')history=value;}catch{}}));}
async function refresh(manual=false){if(busy)return;busy=true;const button=document.getElementById('refresh');button.disabled=true;button.textContent='Refreshing…';await saved();render();
 await Promise.all(Object.entries(slugs).map(async([chamber,slug])=>{try{const r=await fetch(`https://gamma-api.polymarket.com/events/slug/${slug}`,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();data.sources.polymarket??={};data.sources.polymarket[chamber]=parseEvent(await r.json(),chamber);delete data.errors?.[`polymarket/${chamber}`];liveFailures[`polymarket/${chamber}`]=false;}catch{liveFailures[`polymarket/${chamber}`]=true;}}));
 render();button.disabled=false;button.textContent='↻ Refresh odds';busy=false;if(manual)chime();
}
document.getElementById('refresh').addEventListener('click',()=>refresh(true));document.getElementById('source').addEventListener('change',render);for(const id of ['history-chamber','history-days'])document.getElementById(id).addEventListener('change',renderHistory);
document.getElementById('copy').addEventListener('click',async()=>{const text=markdown(data,model),status=document.getElementById('copy-status');try{await navigator.clipboard.writeText(text);status.textContent='Copied source comparisons and model results with timestamps.';}catch{const a=el('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/markdown'}));a.download='congress-odds-README.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);status.textContent='Downloaded README snapshot.';}});
let soundOn=false,audioContext;
function chime(){if(!soundOn||!audioContext)return;try{audioContext.resume();const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.frequency.value=660;gain.gain.setValueAtTime(.035,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.12);oscillator.start();oscillator.stop(audioContext.currentTime+.13);}catch{}}
document.getElementById('sound-toggle').addEventListener('click',()=>{try{if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();soundOn=!soundOn;const button=document.getElementById('sound-toggle');button.textContent=soundOn?'Sound on':'Sound off';button.setAttribute('aria-pressed',String(soundOn));chime();}catch{document.getElementById('sound-toggle').textContent='Sound unavailable';}});
for(const id of ['lab-contract','lab-model','lab-scale'])document.getElementById(id).addEventListener('change',()=>{renderLab(model);chime();});
await refresh();setInterval(()=>refresh(),300000);setInterval(render,60000);

document.getElementById("race-simulator").addEventListener("click",event=>{if(event.target.closest("button"))chime();});
document.getElementById("race-simulator").addEventListener("change",event=>{if(event.target.matches("select"))chime();});
