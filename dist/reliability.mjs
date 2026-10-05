import {sources,parties,slugs,tickers,names} from './data-core.mjs';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const number=v=>typeof v==='number'&&Number.isFinite(v);
const prob=v=>number(v)&&v>=0&&v<=1;
const time=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const positive=v=>Number.isInteger(v)&&v>0;
const contracts=Object.values(tickers).flatMap(t=>['D','R'].map(p=>`${t}-2026-${p}`));
const methods=['baseline','ridge','forest','boost','ensemble'];
const hosts={polymarket:'polymarket.com',kalshi:'kalshi.com',predictit:'www.predictit.org'};
function requireValue(ok,message){if(!ok)throw new Error(message);}
export function validQuote(c,source,chamber,now=Date.now()) {
 if(!object(c)||c.chamber!==chamber||c.source!==names[source]||!time(c.fetchedAt)||Date.parse(c.fetchedAt)>now+300000||typeof c.priceMethod!=='string')return false;
 try{const u=new URL(c.url);if(u.protocol!=='https:'||u.hostname!==hosts[source]||u.username||u.password)return false;}catch{return false;}
 return parties.every(p=>object(c.parties?.[p])&&prob(c.parties[p].probability)&&typeof c.parties[p].closed==='boolean');
}
export function validateLatest(value,now=Date.now()) {
 requireValue(object(value)&&value.schemaVersion===2&&value.electionYear===2026&&object(value.sources),'Unsupported market snapshot');
 const out={schemaVersion:2,electionYear:2026,sources:{},errors:{}};
 let count=0;
 for(const source of sources)for(const chamber of Object.keys(slugs)){
  const c=value.sources[source]?.[chamber];if(c===undefined)continue;
  requireValue(!(source==='predictit'&&chamber==='house')&&validQuote(c,source,chamber,now),`Invalid ${source}/${chamber} snapshot`);
  out.sources[source]??={};out.sources[source][chamber]=structuredClone(c);count++;
  const error=value.errors?.[`${source}/${chamber}`];if(typeof error==='string')out.errors[`${source}/${chamber}`]=error.slice(0,300);
 }
 requireValue(count>0,'No valid source snapshots');return out;
}
export function mergeLatest(current,incoming) {
 const out=structuredClone(current);out.sources??={};out.errors??={};out.schemaVersion=2;out.electionYear=2026;
 for(const source of sources)for(const chamber of Object.keys(slugs)){
  const next=incoming.sources[source]?.[chamber],old=out.sources[source]?.[chamber],key=`${source}/${chamber}`;
  if(!next||(old&&Date.parse(old.fetchedAt)>Date.parse(next.fetchedAt)))continue;
  out.sources[source]??={};out.sources[source][chamber]=structuredClone(next);
  if(incoming.errors?.[key])out.errors[key]=incoming.errors[key];else delete out.errors[key];
 }
 return out;
}
export function validateHistory(value) {
 requireValue(object(value)&&time(value.fetchedAt)&&object(value.series),'Invalid history snapshot');
 for(const key of contracts){const points=value.series[key];requireValue(Array.isArray(points)&&points.length>=2&&points.length<=10000,`Missing history: ${key}`);
  points.forEach((p,i)=>requireValue(object(p)&&positive(p.t)&&prob(p.p)&&(!i||p.t>points[i-1].t),`Invalid or unordered history: ${key}`));}
 return value;
}
export function validateModel(value) {
 requireValue(object(value)&&value.schemaVersion===2&&time(value.trainedAt)&&object(value.series),'Unsupported model snapshot');
 for(const key of contracts){const m=value.series[key];
  requireValue(object(m)&&m.ticker===key&&prob(m.forecast)&&prob(m.lastClose)&&positive(m.testDays)&&positive(m.trainingExamples)&&number(m.maePP)&&m.maePP>=0&&number(m.baselineMaePP)&&m.baselineMaePP>=0&&methods.includes(m.selectedModel),`Invalid model: ${key}`);
  for(const t of ['forecastFor','dataThrough','selectionStart','selectionEnd','testStart','testEnd'])requireValue(time(m[t]),`Invalid model date: ${key}`);
  requireValue(Date.parse(m.selectionStart)<=Date.parse(m.selectionEnd)&&Date.parse(m.selectionEnd)<Date.parse(m.testStart)&&Date.parse(m.testStart)<=Date.parse(m.testEnd)&&Date.parse(m.testEnd)<=Date.parse(m.dataThrough)&&Date.parse(m.dataThrough)<Date.parse(m.forecastFor),'Invalid model chronology');
  requireValue(Array.isArray(m.featureImportance)&&m.featureImportance.length<=5&&m.featureImportance.every(f=>['level','change_1d','change_3d','change_7d','volatility_7d'].includes(f.feature)&&prob(f.importance)),'Invalid feature importance');
  requireValue(object(m.benchmarks),'Missing benchmarks');
  for(const name of methods){const b=m.benchmarks[name];requireValue(object(b)&&prob(b.forecast)&&['maePP','rmsePP','validationMaePP'].every(k=>number(b[k])&&b[k]>=0)&&(b.directionAccuracy===null||(number(b.directionAccuracy)&&b.directionAccuracy>=0&&b.directionAccuracy<=100))&&Number.isInteger(b.directionDays)&&b.directionDays>=0,`Invalid benchmark: ${name}`);
   const points=b.backtest;requireValue(Array.isArray(points)&&points.length===m.testDays&&points.length>=2&&points.length<=2000,'Invalid backtest length');
   points.forEach((p,i)=>requireValue(object(p)&&positive(p.t)&&prob(p.actual)&&prob(p.predicted)&&(!i||p.t>points[i-1].t)&&p.t*1000>=Date.parse(m.testStart)&&p.t*1000<=Date.parse(m.testEnd),'Invalid backtest observations'));
  }
 }
 return value;
}
export async function fetchJson(url,{timeoutMs=8000,attempts=2,baseDelayMs=500,fetcher=globalThis.fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
 let error;
 for(let attempt=0;attempt<attempts;attempt++){
  const controller=new AbortController();let timer;
  try{
   // The deadline includes response-body parsing, even if an implementation ignores abort.
   return await Promise.race([(async()=>{const r=await fetcher(url,{signal:controller.signal,cache:'no-store'});if(!r.ok){const e=new Error(`HTTP ${r.status}`);e.retryable=r.status===408||r.status===429||r.status>=500;throw e;}return await r.json();})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();const e=new Error('Request timed out');e.retryable=true;reject(e);},timeoutMs);})]);
  }catch(e){error=e;if(e.retryable===false||e instanceof SyntaxError||attempt===attempts-1)throw e;}
  finally{clearTimeout(timer);}
  await sleep(Math.min(baseDelayMs*2**attempt,3000));
 }
 throw error||new Error('No fetch attempts');
}
