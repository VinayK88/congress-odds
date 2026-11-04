// Officially certified or explicitly called winners only.
// Inputs are independent from the prediction-market contracts. No leading
// vote tally, price, polling probability or 100%-reporting claim is a call.
import {races} from './scenario-core.mjs';
const MANIFEST=new Set(['house','senate'].flatMap(ch=>races(ch).map(x=>x.id)));
const cleanParty=p=>{
 const v=String(p||'').trim().toUpperCase();
 if(['D','DEM','DEMOCRAT','DEMOCRATIC','DEMOCRATIC PARTY'].includes(v))return 'D';
 if(['R','REP','GOP','REPUBLICAN','REPUBLICAN PARTY'].includes(v))return 'R';
 if(['I','IND','INDEPENDENT','UNAFFILIATED','OTHER'].includes(v))return 'O';
 return null;
};
export function canonicalRaceId(raw){
 const v=String(raw||'').trim().toUpperCase().replace(/^2026-/,'');
 let m=/^([A-Z]{2})[-_](?:HOUSE[-_])?(\d{1,2}|AL|AT-LARGE)$/.exec(v);
 if(!m){
  const h=/^([A-Z]{2})[-_]HOUSE[-_](\d{1,2}|AL|00)$/.exec(v);
  if(h)m=h;
 }
 if(m){
  const suffix=/^(AL|AT-LARGE|00)$/.test(m[2])?'AL':String(Number(m[2])).padStart(2,'0');
  const id=m[1]+'-'+suffix;
  return MANIFEST.has(id)?id:null;
 }
 // watch.vote IDs: 2026-ga-house-05, 2026-ga-senate, etc.
 m=/^([A-Z]{2})[-_]SENATE(?:[-_](?:SPECIAL|REGULAR))?$/.exec(v)||
  /^([A-Z]{2})[-_](?:S|SENATE)$/.exec(v);
 if(m){const id=m[1]+'-S';return MANIFEST.has(id)?id:null;}
 // Exclude the 2024 rehearsal, primaries, and ambiguous numbers.
 return null;
}
const timestamp=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const validUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<600?u.href:null;}catch{return null;}};
const cleanText=(x,n=140)=>typeof x==='string'?x.trim().slice(0,n):null;
const eligibleCallState=s=>{
 const v=String(s||'').trim().toLowerCase().replace(/[\s_]+/g,'-');
 return ['called','certified','projected','race-called','ap-called','officially-certified'].includes(v);
};
export function parseWatchVoteResults(data,now=new Date().toISOString()){
 if(!Array.isArray(data)&&!Array.isArray(data?.rows)&&!Array.isArray(data?.results)&&!Array.isArray(data?.data)&&!Array.isArray(data?.races))throw Error('Unexpected watch.vote election results format');
 const rows=Array.isArray(data)?data:data.rows||data.results||data.data||data.races;
 const winners={};
 for(const row of rows){
  if(!row||typeof row!=='object')continue;
  const id=canonicalRaceId(row.raceId||row.id||row.raceSlug);
  const result=row.result;
  if(!id||!result||typeof result!=='object'||!eligibleCallState(result.callState))continue;
  // Exactly one winner flag is mandatory. A vote leader is NEVER a call.
  const candidates=Array.isArray(result.candidates)?result.candidates:[];
  const flagged=candidates.filter(c=>c?.winner===true);
  if(flagged.length!==1)continue;
  const c=flagged[0],party=cleanParty(c.party);
  if(!party)continue;
  const source=result.source||row.official||{};
  const url=validUrl(source.url)||validUrl(row.official?.url)||null;
  if(!url||!source.authority&&!result.calledBy)continue;
  const updated=timestamp(result.updatedAt)?new Date(result.updatedAt).toISOString():now;
  winners[id]={
   party,name:cleanText(c.name)||'Name not supplied',status:String(result.callState).toLowerCase()==='certified'?'certified':'called',
   source:cleanText(source.authority||result.calledBy)||'Election results desk',
   sourceUrl:url,updatedAt:updated
  };
 }
 return winners;
}
export function parsePeopleTallyResults(data,now=new Date().toISOString()){
 if(!data||typeof data!=='object'||Array.isArray(data)||!data.races||typeof data.races!=='object')throw Error('Unexpected Peoples Tally results');
 const winners={};
 for(const [key,r] of Object.entries(data.races)){
  const id=canonicalRaceId(key);
  if(!id||!r||typeof r!=='object')continue;
  if(!['called','certified'].includes(String(r.status||'').toLowerCase())||!r.called_by)continue;
  const flags=Array.isArray(r.cands)?r.cands.filter(c=>c?.winner===true):[];
  if(flags.length!==1)continue;
  const party=cleanParty(flags[0].party);
  if(!party)continue;
  const url=validUrl(r.url),time=timestamp(r.asof)?new Date(r.asof).toISOString():now;
  if(!url)continue;
  winners[id]={party,name:cleanText(flags[0].name)||'Name not supplied',status:r.status.toLowerCase(),
    source:cleanText(r.called_by)||"The People's Tally",sourceUrl:url,updatedAt:time};
 }
 return winners;
}
export function validateCalls(snapshot){
 if(!snapshot||snapshot.schemaVersion!==1||snapshot.electionYear!==2026||!timestamp(snapshot.checkedAt)||
    !snapshot.winners||typeof snapshot.winners!=='object'||Array.isArray(snapshot.winners)||
    Object.keys(snapshot.winners).length>470)throw Error('Invalid election calls snapshot');
 for(const [id,c] of Object.entries(snapshot.winners)){
  if(!MANIFEST.has(id)||!['D','R','O'].includes(c?.party)||!['called','certified'].includes(c?.status)||
    !cleanText(c.name)||!cleanText(c.source)||!validUrl(c.sourceUrl)||!timestamp(c.updatedAt))throw Error('Invalid verified race call: '+id);
 }
 return snapshot;
}
export const countCalls=(snapshot,chamber)=>{
 const ids=new Set(races(chamber).map(r=>r.id)),counts={D:0,R:0,O:0,total:0};
 for(const [id,c] of Object.entries(snapshot?.winners||{})){
  if(ids.has(id)&&['D','R','O'].includes(c?.party)){counts[c.party]++;counts.total++;}
 }
 return counts;
};
export function selectWinner(snapshot,id){
 const winner=snapshot?.winners?.[id];
 if(!winner||!['D','R','O'].includes(winner.party)||!['called','certified'].includes(winner.status))return null;
 return winner;
}
