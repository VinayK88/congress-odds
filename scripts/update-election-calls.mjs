// Source-attributed election calls. Never infer a winner from leading votes or odds.
import {readFile,writeFile} from 'node:fs/promises';
import {parseWatchVoteResults,parsePeopleTallyResults,validateCalls} from '../dist/election-calls-core.mjs';
const destination=new URL('../dist/data/election-calls.json',import.meta.url);
const now=new Date().toISOString();
let prior=null;
try{prior=validateCalls(JSON.parse(await readFile(destination,'utf8')));}catch(e){console.warn('Prior calls unavailable:',String(e));}
async function get(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),17000);
 try{
  const res=await fetch(url,{headers:{Accept:'application/json','User-Agent':'CongressOdds-Election-Desk/1.0 (github.com/VinayK88/congress-odds)'},signal:controller.signal});
  if(!res.ok)throw Error('HTTP '+res.status+' from '+new URL(url).host);
  const raw=await res.text();if(raw.length>5000000)throw Error('Oversized election response');
  return JSON.parse(raw);
 }finally{clearTimeout(timer)}
}
const sources=[],inputs=[
 {name:'watch.vote',url:'https://watch.vote/api/elections/2026/results?office=house',parse:parseWatchVoteResults},
 {name:'watch.vote',url:'https://watch.vote/api/elections/2026/results?office=senate',parse:parseWatchVoteResults},
 {name:"The People's Tally",url:'https://thepeoplestally.com/data/results.json',parse:parsePeopleTallyResults}
];
const winners={},disputes=new Set();
for(const input of inputs){
 try{
  const data=await get(input.url),calls=input.parse(data,now);
  const count=Object.keys(calls).length;
  console.log(input.name,new URL(input.url).pathname,'called winners:',count);
  sources.push({name:input.name,url:input.url,status:'ok',winnerCount:count});
  for(const [id,c] of Object.entries(calls)){
   if(disputes.has(id))continue;
   if(winners[id]&&winners[id].party!==c.party){
    console.warn('Conflicting winner calls for '+id+'; omitting');delete winners[id];disputes.add(id);continue;
   }
   if(!winners[id])winners[id]=c;
  }
 }catch(e){
  console.warn('Calls feed unavailable:',input.name,String(e));
  sources.push({name:input.name,url:input.url,status:'unavailable',winnerCount:0});
 }
}
if(sources.some(s=>s.status==='ok')){
 // Preserve previously attributed calls when one provider is temporarily down.
 for(const [id,c] of Object.entries(prior?.winners||{})){
  if(!winners[id]&&!disputes.has(id))winners[id]=c;
 }
 const result=validateCalls({schemaVersion:1,electionYear:2026,checkedAt:now,
  sourceStatus:Object.keys(winners).length?'source-backed calls':'no published calls',sources,winners});
 await writeFile(destination,JSON.stringify(result,null,2)+'\n');
 console.log('Published '+Object.keys(winners).length+' source-attributed calls.');
}else console.warn('All feeds failed; preserved previous snapshot with original timestamp.');
