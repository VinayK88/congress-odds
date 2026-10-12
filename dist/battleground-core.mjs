// Contested-market radar: gaps between independent active Polymarket Yes quotes.
// This is NOT a polling margin, election forecast, or an election outcome.
import {races} from './scenario-core.mjs';
import {candidateFresh} from './candidate-core.mjs';
import {STATES} from './race-data.mjs';

const names=Object.fromEntries(STATES.map(s=>[s.code,s.name]));
export const RADAR_THRESHOLDS=Object.freeze([5,10,20]);
export function battlegroundRadar(snapshot,chamber,now=Date.now(),thresholdPP=20){
 if(!['senate','house'].includes(chamber))throw Error('Unsupported chamber');
 if(!RADAR_THRESHOLDS.includes(thresholdPP))throw Error('Unsupported gap threshold');
 const contests=races(chamber);
 const lookup=new Map((snapshot?.races||[]).map(x=>[x.id,x]));
 const close=[], all=[];
 let fresh=0,comparable=0;
 for(const race of contests){
  const source=lookup.get(race.id);
  if(!source||!candidateFresh(source,now))continue;
  fresh++;
  const eligible=(source.candidates||[]).filter(c=>c.active===true&&c.closed===false);
  if(eligible.length<2||eligible.some(c=>typeof c.probability!=='number'||!Number.isFinite(c.probability)||c.probability<0||c.probability>1))continue;
  const top=[...eligible].sort((a,b)=>b.probability-a.probability).slice(0,2);
  if(!(top.some(c=>c.party==='D')&&top.some(c=>c.party==='R')))continue;
  comparable++;
  const gapPP=(top[0].probability-top[1].probability)*100;
  const item={
   id:race.id,state:race.state,stateName:names[race.state],
   chamber,leader:gapPP<0.05?'TIED':top[0].party,
   gapPP,quotedAt:source.fetchedAt,
   contracts:top.map(c=>({
    party:c.party,name:c.name||c.label,price:c.probability,scope:c.scope
   }))
  };
  all.push(item);
  if(gapPP<=thresholdPP+1e-9)close.push(item);
 }
 const sort=(a,b)=>a.gapPP-b.gapPP||a.id.localeCompare(b.id);
 all.sort(sort);close.sort(sort);
 return {chamber,thresholdPP,total:contests.length,fresh,comparable,
  count:close.length,close,closest:all.slice(0,3)};
}
