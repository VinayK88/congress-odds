import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {slugs,tickers,parseEvent,parseKalshi,parsePredictIt,predictItMarkets,parseManifold,manifoldMarkets} from '../dist/data-core.mjs';
import {fetchJson,validateLatest} from '../dist/reliability.mjs';
const root=new URL('../',import.meta.url);
let previous={};try{previous=validateLatest(JSON.parse(await readFile(new URL('dist/data/latest.json',root),'utf8')));}catch{}
const snapshot={schemaVersion:2,electionYear:2026,sources:previous.sources??{polymarket:previous.chambers??{}},errors:{}};
const tasks=Object.keys(slugs).flatMap(chamber=>[
 {source:'polymarket',chamber,url:`https://gamma-api.polymarket.com/events/slug/${slugs[chamber]}`,parse:x=>parseEvent(x,chamber)},
 {source:'kalshi',chamber,url:`https://api.elections.kalshi.com/trade-api/v2/events/${tickers[chamber]}-2026?with_nested_markets=true`,parse:x=>parseKalshi(x,chamber)}
]);
for(const chamber of Object.keys(slugs)){
 tasks.push({source:'predictit',chamber,url:`https://www.predictit.org/api/marketdata/markets/${predictItMarkets[chamber]}`,parse:x=>parsePredictIt(x,undefined,chamber)});
 tasks.push({source:'manifold',chamber,urls:Object.values(manifoldMarkets[chamber]).map(m=>`https://api.manifold.markets/v0/market/${m.id}`),parse:x=>parseManifold(x,chamber)});
}
let successes=0;
await Promise.all(tasks.map(async task=>{
 try{const c=task.parse(task.urls?await Promise.all(task.urls.map(url=>fetchJson(url,{timeoutMs:20000,attempts:3}))):await fetchJson(task.url,{timeoutMs:20000,attempts:3}));snapshot.sources[task.source]??={};snapshot.sources[task.source][task.chamber]=c;successes++;}
 catch(error){snapshot.errors[`${task.source}/${task.chamber}`]=String(error.message);console.warn(`Source unavailable: ${task.source}/${task.chamber}`);}
}));
if(!successes)throw Error('All source refreshes failed; retaining previous files');
validateLatest(snapshot);
await mkdir(new URL('dist/data/',root),{recursive:true});
await writeFile(new URL('dist/data/latest.json.tmp',root),JSON.stringify(snapshot,null,2)+'\n');
await rename(new URL('dist/data/latest.json.tmp',root),new URL('dist/data/latest.json',root));
console.log(`Updated ${successes}/${tasks.length} source/chamber pairs.`);
