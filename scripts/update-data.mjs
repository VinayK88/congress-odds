import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {slugs,tickers,parseEvent,parseKalshi,parsePredictIt,markdown} from '../dist/data-core.mjs';
const root=new URL('../',import.meta.url);
let previous={};try{previous=JSON.parse(await readFile(new URL('dist/data/latest.json',root),'utf8'));}catch{}
const snapshot={schemaVersion:2,electionYear:2026,sources:previous.sources??{polymarket:previous.chambers??{}},errors:{}};
const tasks=Object.keys(slugs).flatMap(chamber=>[
 {source:'polymarket',chamber,url:`https://gamma-api.polymarket.com/events/slug/${slugs[chamber]}`,parse:x=>parseEvent(x,chamber)},
 {source:'kalshi',chamber,url:`https://api.elections.kalshi.com/trade-api/v2/events/${tickers[chamber]}-2026?with_nested_markets=true`,parse:x=>parseKalshi(x,chamber)}
]);
tasks.push({source:'predictit',chamber:'senate',url:'https://www.predictit.org/api/marketdata/markets/8155',parse:parsePredictIt});
let successes=0;
await Promise.all(tasks.map(async task=>{
 let error;for(let i=0;i<3;i++){try{const r=await fetch(task.url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(`HTTP ${r.status}`);const c=task.parse(await r.json());snapshot.sources[task.source]??={};snapshot.sources[task.source][task.chamber]=c;successes++;return;}catch(e){error=e;}}
 snapshot.errors[`${task.source}/${task.chamber}`]=String(error.message);console.warn(`Source unavailable: ${task.source}/${task.chamber}`);
}));
if(!successes)throw Error('All source refreshes failed; retaining previous files');
await mkdir(new URL('dist/data/',root),{recursive:true});
await writeFile(new URL('dist/data/latest.json.tmp',root),JSON.stringify(snapshot,null,2)+'\n');
await rename(new URL('dist/data/latest.json.tmp',root),new URL('dist/data/latest.json',root));
console.log(`Updated ${successes}/${tasks.length} source/chamber pairs.`);
