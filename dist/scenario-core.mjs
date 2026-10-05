import {STATES,HOLDOVERS} from './race-data.mjs';
export const PARTIES = Object.freeze({D:'Democratic-aligned',R:'Republican-aligned',O:'Other / unaffiliated',U:'Unassigned'});
export function races(chamber, state) {
  if (!['senate','house'].includes(chamber)) throw new Error('Unknown chamber');
  return STATES.filter(s=>!state || s.code===state).flatMap(s=>chamber==='senate'
    ? (s.senateParty ? [{id:`${s.code}-S`,state:s.code,label:s.special?'Special Senate election':'Senate election',incumbent:s.senateParty}] : [])
    : Array.from({length:s.houseSeats},(_,i)=>({id:`${s.code}-${s.houseSeats===1?'AL':String(i+1).padStart(2,'0')}`,state:s.code,label:s.houseSeats===1?'At-large district':`District ${i+1}`})));
}
export function emptyScenario() { return {version:1,senate:{},house:{},vp:'R'}; }
export function validateScenario(input) {
  if (!input || input.version!==1 || !['D','R','none'].includes(input.vp)) throw new Error('Unsupported scenario');
  const out=emptyScenario();out.vp=input.vp;
  for(const chamber of ['senate','house']) {
    if (!input[chamber] || typeof input[chamber]!=='object' || Array.isArray(input[chamber])) throw new Error('Invalid seats');
    const valid=new Set(races(chamber).map(r=>r.id));
    for(const [id,party] of Object.entries(input[chamber])) {
      if(!valid.has(id) || !Object.hasOwn(PARTIES,party)) throw new Error('Invalid assignment');
      if(party!=='U') out[chamber][id]=party;
    }
  }
  return out;
}
export function seatPartyPreset() { return Object.fromEntries(races('senate').map(r=>[r.id,r.incumbent])); }
export function tally(scenario,chamber) {
  const counts=chamber==='senate'?{...HOLDOVERS}:{D:0,R:0,O:0,U:0};
  for(const race of races(chamber)) counts[scenario[chamber][race.id] || 'U']++;
  const total=chamber==='senate'?100:435,majority=Math.floor(total/2)+1;
  let control=null,tie=false;
  if(counts.D>=majority) control='D';
  if(counts.R>=majority) control='R';
  if(chamber==='senate' && counts.D===50 && counts.R===50 && scenario.vp!=='none') {control=scenario.vp;tie=true;}
  return {counts,total,majority,control,tie};
}
