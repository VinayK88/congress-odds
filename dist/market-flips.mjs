// Historical market-leader changes from genuine Polymarket Yes-contract snapshots.
// A leader flip is NOT an election outcome, seat pickup, or prediction.
import {STATES} from './race-data.mjs';
import {races} from './scenario-core.mjs';

const knownRaces=Object.fromEntries(['senate','house'].map(ch=>[ch,new Set(races(ch).map(r=>r.id))]));
const partyFor=(entry,point)=>{
 if(!Array.isArray(point)||point.length!==5)return null;
 if(!Number.isFinite(point[2])||!Number.isFinite(point[4])||point[2]<=point[4])return null;
 const party=entry.contracts?.[point[1]]?.party;
 return party==='D'||party==='R'?party:null;
};
export const FLIP_WINDOWS=Object.freeze([24,168]);
export function marketLeaderFlips(archive,chamber='senate',now=Date.now(),hours=24){
 if(!knownRaces[chamber])throw Error('Unsupported chamber');
 if(!FLIP_WINDOWS.includes(hours))throw Error('Unsupported history window');
 const cutoff=now/1000-hours*3600;
 const states=new Map(), flips=[];
 let compared=0,insufficient=0;
 for(const race of races(chamber)){
  const history=archive?.races?.[race.id];
  const points=(history?.points||[]).filter(p=>p[0]>=cutoff&&p[0]*1000<=now+300000);
  if(points.length<2){insufficient++;continue;}
  let usablePairs=0,switchCount=0,mostRecent=null;
  for(let i=1;i<points.length;i++){
   const previous=partyFor(history,points[i-1]),current=partyFor(history,points[i]);
   if(!previous||!current)continue; // never infer through unknown-party observations
   usablePairs++;
   if(previous===current)continue;
   switchCount++;
   mostRecent={raceId:race.id,state:race.state,from:previous,to:current,
     at:points[i][0],before:points[i-1][0],leaderPrice:points[i][2],
     previousPrice:points[i-1][2],switches:switchCount};
  }
  if(!usablePairs){insufficient++;continue;}
  compared++;
  if(mostRecent){
   mostRecent.switches=switchCount;
   flips.push(mostRecent);
   const group=states.get(race.state)||{state:race.state,count:0,latest:0,to:mostRecent.to,raceIds:[]};
   group.count++;group.latest=Math.max(group.latest,mostRecent.at);
   if(group.latest===mostRecent.at)group.to=mostRecent.to;
   group.raceIds.push(race.id);
   states.set(race.state,group);
  }
 }
 flips.sort((a,b)=>b.at-a.at||a.raceId.localeCompare(b.raceId));
 const total=races(chamber).length;
 return {chamber,hours,total,compared,insufficient,flippedRaces:flips.length,
   flippedStates:states.size,events:flips.reduce((s,f)=>s+f.switches,0),
   flips,states:Object.fromEntries(states)};
}
export const partyName=p=>p==='D'?'Democratic':p==='R'?'Republican':'Unknown';
export function flipLabel(change){
 return partyName(change.from)+' → '+partyName(change.to);
}
