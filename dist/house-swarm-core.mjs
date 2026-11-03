// Source-backed election bubble atlases. One circle per contested race.
// The data are independent Polymarket Yes prices, NEVER certified results.
import {races} from './scenario-core.mjs';
import {raceLeader} from './market-map.mjs';

export const HOUSE_BANDS=Object.freeze([
 {id:'D-strong',label:'90%+ quoted',party:'D',tier:'strong',min:.90},
 {id:'D-likely',label:'75–89.9%',party:'D',tier:'likely',min:.75},
 {id:'D-lean',label:'60–74.9%',party:'D',tier:'lean',min:.60},
 {id:'close',label:'Close · under 60%',party:null,tier:'close',min:0},
 {id:'R-lean',label:'60–74.9%',party:'R',tier:'lean',min:.60},
 {id:'R-likely',label:'75–89.9%',party:'R',tier:'likely',min:.75},
 {id:'R-strong',label:'90%+ quoted',party:'R',tier:'strong',min:.90}
]);
export const HOUSE_TOTAL=435;
export const SENATE_RACES=35;
const validTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function houseBand(leader){
 if(!leader||!['D','R'].includes(leader.party)||!Number.isFinite(leader.probability))return 'unavailable';
 const p=leader.probability;
 if(p<0||p>1)return 'unavailable';
 if(p<.60)return 'close';
 if(p<.75)return leader.party+'-lean';
 if(p<.90)return leader.party+'-likely';
 return leader.party+'-strong';
}
export function raceDistribution(snapshot,chamber,now=Date.now()){
 if(!['house','senate'].includes(chamber))throw Error('Unknown chamber for bubble atlas');
 const expected=chamber==='house'?HOUSE_TOTAL:SENATE_RACES;
 const records=new Map((snapshot?.races||[]).filter(r=>r?.chamber===chamber).map(r=>[r.id,r]));
 const hasTime=validTime(snapshot?.updatedAt)&&Date.parse(snapshot.updatedAt)<=now+5*60000;
 const asOf=hasTime?Math.min(now,Date.parse(snapshot.updatedAt)):now;
 // Retain historical quote context on subsequent days, but never call it live.
 const archived=hasTime&&now-asOf>2*3600000;
 const reference=archived?asOf:now;
 const bubbles=races(chamber).map(district=>{
  const source=records.get(district.id);
  const leader=raceLeader(source,reference);
  const band=houseBand(leader);
  const pair=(source?.candidates||[]).filter(c=>c.active&&!c.closed&&Number.isFinite(c.probability))
   .sort((a,b)=>b.probability-a.probability).slice(0,2);
  return {
   id:district.id,state:district.state,band,
   party:leader.party,probability:leader.probability,reason:leader.reason||null,
   leaderName:leader.candidate?.name||leader.candidate?.label||null,
   candidateScope:leader.candidate?.scope||null,
   pair:pair.map(c=>({name:c.name||c.label,party:c.party,probability:c.probability,scope:c.scope})),
   fetchedAt:source?.fetchedAt||null,url:source?.url||null
  };
 });
 const counts=Object.fromEntries([...HOUSE_BANDS.map(b=>b.id),'unavailable'].map(k=>[k,0]));
 for(const bubble of bubbles)counts[bubble.band]++;
 if(bubbles.length!==expected||Object.values(counts).reduce((a,b)=>a+b,0)!==expected)throw Error('Invalid district/race distribution');
 const byParty={
  D:bubbles.filter(b=>b.party==='D'&&b.band!=='unavailable').length,
  R:bubbles.filter(b=>b.party==='R'&&b.band!=='unavailable').length,
  O:bubbles.filter(b=>b.party==='O').length,
  U:bubbles.filter(b=>b.party==='U').length
 };
 return {chamber,bubbles,counts,byParty,total:expected,asOf:hasTime?new Date(asOf).toISOString():null,archived,hasSnapshot:Boolean(snapshot&&hasTime)};
}
export const houseDistribution=(snapshot,now=Date.now())=>raceDistribution(snapshot,'house',now);
export const senateDistribution=(snapshot,now=Date.now())=>raceDistribution(snapshot,'senate',now);

export function bubbleHash(id){
 let h=2166136261;
 for(const c of String(id)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
 return h>>>0;
}
// Wide, label-friendly matrix. Every bubble carries an actual two-letter state
// abbreviation; House bubbles repeat abbreviations across individual districts.
// Chart height expands for unusually concentrated price bands, never squashing
// labels or allowing circles to overlap.
// Narrow viewports: stack the seven price bands into full-width rows rather
// than compressing labeled circles or requiring horizontal dragging.
function compactRaceLayout(distribution,availableWidth){
 const senate=distribution.chamber==='senate';
 const width=Math.max(240,Math.floor(availableWidth));
 const radius=senate?15.3:12.5,step=senate?34:28;
 const edge=16;
 const cols=Math.max(1,Math.floor((width-2*edge)/step));
 const byBand=new Map(HOUSE_BANDS.map(b=>[b.id,[]]));
 const unavailable=[];
 for(const b of distribution.bubbles){
  const group=byBand.get(b.band);
  if(group)group.push(b);else unavailable.push(b);
 }
 const nodes=[],sections=[];
 let y=13;
 const drawSection=(id,label,items)=>{
  items.sort((a,b)=>bubbleHash(a.id)-bubbleHash(b.id)||a.id.localeCompare(b.id));
  const rows=Math.ceil(items.length/cols);
  const headerY=y+19,firstY=y+55;
  const count=items.length;
  sections.push({id,label,count,headerY,firstY,top:y});
  for(let i=0;i<count;i++){
   const row=Math.floor(i/cols),col=i%cols;
   const onRow=Math.min(cols,count-row*cols);
   nodes.push({...items[i],x:width/2+(col-(onRow-1)/2)*step,y:firstY+row*step,r:radius});
  }
  y=firstY+Math.max(1,rows)*step+10;
 };
 for(const b of HOUSE_BANDS)drawSection(b.id,b.label,byBand.get(b.id));
 drawSection('unavailable','Other, stale or unavailable quotes',unavailable);
 return {
  compact:true,nodes,width,height:y+12,sections,
  // Maintain a stable public geometry shape for clients and tests.
  left:edge,bandWidth:width,axisY:0,dividerY:0,unknownTitleY:0,unknownY:0,mainLast:0
 };
}
export function layoutRaceBubbles(distribution,availableWidth=null){
 if(Number.isFinite(availableWidth)&&availableWidth>0&&availableWidth<1100){
  return compactRaceLayout(distribution,availableWidth);
 }

 const senate=distribution.chamber==='senate';
 const width=1580,left=55,bandWidth=210,top=119;
 const step=senate?36:28.4;
 const radius=senate?16.4:12.85;
 const columns=senate?5:7;
 const byBand=new Map(HOUSE_BANDS.map(b=>[b.id,[]]));
 const unavailable=[];
 for(const b of distribution.bubbles){
  if(byBand.has(b.band))byBand.get(b.band).push(b);
  else unavailable.push(b);
 }
 const bands=HOUSE_BANDS.map(b=>{
  const items=byBand.get(b.id).sort((a,c)=>bubbleHash(a.id)-bubbleHash(c.id)||a.id.localeCompare(c.id));
  return {band:b,items,rows:Math.ceil(items.length/columns)};
 });
 const maxRows=Math.max(1,...bands.map(b=>b.rows));
 const mainLast=top+(maxRows-1)*step+radius;
 const axisY=mainLast+30;
 const dividerY=axisY+22;
 const unknownTitleY=dividerY+29;
 const unknownY=unknownTitleY+33;
 const unknownStep=senate?37:28.4;
 const unknownRadius=senate?16.4:12.85;
 const unknownColumns=senate?40:51;
 const sortedMissing=unavailable.sort((a,b)=>bubbleHash(a.id)-bubbleHash(b.id)||a.id.localeCompare(b.id));
 const missingRows=Math.max(1,Math.ceil(sortedMissing.length/unknownColumns));
 const nodes=[];
 for(const [i,b] of bands.entries()){
  const center=left+bandWidth*i+bandWidth/2;
  b.items.forEach((item,j)=>{
   const col=j%columns,row=Math.floor(j/columns),h=bubbleHash(item.id);
   const jitter=((h%100)/100-.5)*.7;
   const x=center+(col-(columns-1)/2)*step+jitter;
   const y=top+row*step+(((h>>>8)%100)/100-.5)*.7;
   nodes.push({...item,x,y,r:radius});
  });
 }
 sortedMissing.forEach((item,i)=>{
  const row=Math.floor(i/unknownColumns),col=i%unknownColumns;
  const onRow=Math.min(unknownColumns,sortedMissing.length-row*unknownColumns);
  const center=width/2;
  const x=center+(col-(onRow-1)/2)*unknownStep;
  const y=unknownY+row*unknownStep;
  nodes.push({...item,x,y,r:unknownRadius});
 });
 const height=unknownY+(missingRows-1)*unknownStep+unknownRadius+41;
 return {nodes,width,height,left,bandWidth,axisY,dividerY,unknownTitleY,unknownY,mainLast};
}
export const layoutHouseBubbles=distribution=>layoutRaceBubbles(distribution).nodes;
export const layoutSenateBubbles=distribution=>layoutRaceBubbles(distribution).nodes;
