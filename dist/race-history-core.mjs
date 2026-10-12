// Authentic Polymarket Gamma snapshots, collected from the site's verified race feed.
// No interpolation, fabricated backfills, inferred history or normalized odds.
import {STATES} from './race-data.mjs';
import {races} from './scenario-core.mjs';

export const HISTORY_INTERVAL_SECONDS=3600; // one genuine observed sample per hour/race
export const HISTORY_RETENTION_SECONDS=7*86400;
export const HISTORY_MAX_POINTS=168; // at most seven days at hourly cadence
const VALID_RACES=new Set(['senate','house'].flatMap(ch=>races(ch).map(r=>r.id)));
const validProbability=p=>typeof p==='number'&&Number.isFinite(p)&&p>=0&&p<=1;
const validTime=t=>Number.isSafeInteger(t)&&t>0;
const validLabel=s=>typeof s==='string'&&s.length>=1&&s.length<=150;
const validId=s=>typeof s==='string'&&/^\d{1,30}$/.test(s);
const contractLabel=c=>c.name||c.label;

export function emptyRaceHistory(){
 return {schemaVersion:1,electionYear:2026,source:'Polymarket Gamma API',races:{}};
}
export function validateRaceHistory(value,now=Date.now()){
 if(!value||value.schemaVersion!==1||value.electionYear!==2026||value.source!=='Polymarket Gamma API'||
    !value.races||typeof value.races!=='object'||Array.isArray(value.races)||
    Object.keys(value.races).length>470)throw Error('Invalid race history header');
 for(const [raceId,entry] of Object.entries(value.races)){
  if(!VALID_RACES.has(raceId)||!entry||!Array.isArray(entry.points)||
     entry.points.length<1||entry.points.length>HISTORY_MAX_POINTS||
     !entry.contracts||typeof entry.contracts!=='object'||Array.isArray(entry.contracts)||
     Object.keys(entry.contracts).length>40)throw Error('Invalid history race: '+raceId);
  for(const [id,desc] of Object.entries(entry.contracts)){
   if(!validId(id)||!desc||!validLabel(desc.label)||
      !['D','R','I','L','G','O','U'].includes(desc.party)||
      !['party','individual'].includes(desc.scope))throw Error('Invalid history contract metadata: '+raceId);
  }
  let previous=0;
  for(const point of entry.points){
   if(!Array.isArray(point)||point.length!==5||!validTime(point[0])||
      point[0]<=previous||point[0]*1000>now+300000||
      !validId(point[1])||!validProbability(point[2])||
      !validId(point[3])||!validProbability(point[4])||
      point[1]===point[3]||!entry.contracts[point[1]]||!entry.contracts[point[3]])
      throw Error('Invalid historical quote in '+raceId);
   previous=point[0];
  }
 }
 return value;
}
export function appendRaceSnapshots(history,candidates,now=Date.now()){
 // Validate stored history and the source snapshot before extending it.
 validateRaceHistory(history,now);
 const next=structuredClone(history);
 let additions=0;
 for(const race of candidates.races||[]){
  if(!VALID_RACES.has(race.id))continue;
  const t=Math.floor(Date.parse(race.fetchedAt)/1000);
  if(!validTime(t)||t*1000>now+300000)continue;
  const eligible=(race.candidates||[]).filter(c=>
   c.active===true&&c.closed===false&&validId(String(c.id))&&
   validProbability(c.probability)&&validLabel(contractLabel(c))&&
   ['party','individual'].includes(c.scope));
  eligible.sort((a,b)=>b.probability-a.probability);
  if(eligible.length<2)continue;
  const [first,second]=eligible;
  const entry=next.races[race.id]||{contracts:{},points:[]};
  const last=entry.points.at(-1)?.[0]||0;
  if(t<=last||t-last<HISTORY_INTERVAL_SECONDS)continue;
  for(const c of [first,second])entry.contracts[String(c.id)]={
   label:contractLabel(c),party:c.party,scope:c.scope
  };
  entry.points.push([t,String(first.id),first.probability,String(second.id),second.probability]);
  next.races[race.id]=entry;
  additions++;
 }
 const threshold=Math.floor(now/1000)-HISTORY_RETENTION_SECONDS;
 for(const [id,entry] of Object.entries(next.races)){
  entry.points=entry.points.filter(p=>p[0]>=threshold).slice(-HISTORY_MAX_POINTS);
  if(!entry.points.length){delete next.races[id];continue;}
  const ids=new Set(entry.points.flatMap(p=>[p[1],p[3]]));
  entry.contracts=Object.fromEntries(Object.entries(entry.contracts).filter(([id])=>ids.has(id)));
 }
 validateRaceHistory(next,now);
 return {history:next,additions};
}
export function raceHistorySeries(history,raceId,contractIds,now=Date.now(),windowHours=168){
 if(!history||!VALID_RACES.has(raceId))return [];
 const entry=history.races?.[raceId];
 if(!entry)return [];
 const threshold=now-Math.max(1,windowHours)*3600000;
 return contractIds.map(id=>{
  const key=String(id);
  return {
   id:key,
   label:entry.contracts[key]?.label||'Contract '+key,
   party:entry.contracts[key]?.party||'U',
   points:entry.points.filter(p=>p[0]*1000>=threshold)
     .map(p=>[p[0],p[1]===key?p[2]:p[3]===key?p[4]:null])
     .filter(([,value])=>value!==null)
  };
 });
}
