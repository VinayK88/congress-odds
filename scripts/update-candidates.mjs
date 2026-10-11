import {readFile,writeFile,rename} from 'node:fs/promises';
import {fetchJson} from '../dist/reliability.mjs';
import {parseCandidateEvent,preferRace,validateCandidates} from '../dist/candidate-core.mjs';
const target=new URL('../dist/data/candidates.json',import.meta.url);
let previous={races:[]};try{previous=validateCandidates(JSON.parse(await readFile(target,'utf8')));}catch{}
const retained=new Map(previous.races.map(r=>[r.id,r]));
const errors={};let successes=0;
for(const [chamber,tag]of [['senate','senate-midterms'],['house','house-elections']]){
 try{
  const next=new Map();let complete=false;
  for(let offset=0;offset<3000;offset+=100){
   const events=await fetchJson(`https://gamma-api.polymarket.com/events?tag_slug=${tag}&limit=100&offset=${offset}&order=id&ascending=true`,{timeoutMs:20000,attempts:2});
   if(!Array.isArray(events))throw Error('Unexpected event list');
   const fetchedAt=new Date().toISOString();
   for(const event of events){const parsed=parseCandidateEvent(event,fetchedAt);if(parsed?.chamber===chamber)next.set(parsed.id,preferRace(next.get(parsed.id),parsed));}
   if(events.length<100){complete=true;break;}
  }
  if(!complete||!next.size)throw Error('Incomplete race discovery');
  // Newly fetched outcomes replace their race atomically, including removed names.
  // Missing races retain the previous fetch time so they naturally become stale.
  for(const [id,race]of next)retained.set(id,race);
  successes++;console.log(`${chamber}: refreshed ${next.size} race markets`);
 }catch(error){errors[chamber]=String(error.message);console.warn(`${chamber}: retaining timestamped previous candidate data`);}
}
if(!successes)throw Error('Candidate refresh failed; previous file retained');
// Match public-domain congressional portraits by full name + state only; never fuzzy-match people.
const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
try{
 const legislators=await fetchJson('https://unitedstates.github.io/congress-legislators/legislators-current.json',{timeoutMs:15000,attempts:1});
 if(!Array.isArray(legislators))throw Error('Invalid portrait directory');
 for(const race of retained.values())for(const c of race.candidates){
  if(c.image||!c.name)continue;
  const match=legislators.filter(l=>l.terms?.at(-1)?.state===race.state&&/^[A-Z]\d{6}$/.test(l.id?.bioguide||'')&&[l.name?.official_full,[l.name?.first,l.name?.last].filter(Boolean).join(' '),[l.name?.nickname,l.name?.last].filter(Boolean).join(' ')].filter(Boolean).some(n=>normalize(n)===normalize(c.name)));
  if(match.length===1){c.image=`https://unitedstates.github.io/images/congress/225x275/${match[0].id.bioguide}.jpg`;c.imageCredit='U.S. Congress / unitedstates';}
 }
}catch{console.warn('Optional portrait directory unavailable; source images and placeholders remain.');}
const snapshot={schemaVersion:1,electionYear:2026,source:'Polymarket Gamma API',updatedAt:new Date().toISOString(),errors,races:[...retained.values()].sort((a,b)=>a.id.localeCompare(b.id))};
validateCandidates(snapshot);
await writeFile(new URL('candidates.json.tmp',target),JSON.stringify(snapshot,null,2)+'\n');await rename(new URL('candidates.json.tmp',target),target);
console.log(`${snapshot.races.length} races; ${snapshot.races.flatMap(r=>r.candidates).filter(c=>c.name).length} named market outcomes; ${snapshot.races.flatMap(r=>r.candidates).filter(c=>c.image).length} image links.`);
