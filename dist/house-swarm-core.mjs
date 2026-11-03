// One bubble per real House district, classified by eligible market quotes.
// Bands represent independent Polymarket Yes prices; they are not election calls.
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
export function houseDistribution(snapshot,now=Date.now()){
 const records=new Map((snapshot?.races||[]).filter(r=>r?.chamber==='house').map(r=>[r.id,r]));
 const available=validTime(snapshot?.updatedAt)&&Date.parse(snapshot.updatedAt)<=now+5*60000;
 // On election night or after it, retain the historical captured distribution
 // but label it as archived if outside the two-hour freshness window.
 const asOf=available?Math.min(now,Date.parse(snapshot.updatedAt)):now;
 const archived=available&&now-asOf>2*3600000;
 const reference=archived?asOf:now;
 const bubbles=races('house').map((district)=>{
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
 if(bubbles.length!==HOUSE_TOTAL||Object.values(counts).reduce((a,b)=>a+b,0)!==HOUSE_TOTAL)throw Error('Invalid House district distribution');
 const byParty={
  D:bubbles.filter(x=>x.party==='D'&&x.band!=='unavailable').length,
  R:bubbles.filter(x=>x.party==='R'&&x.band!=='unavailable').length,
  O:bubbles.filter(x=>x.party==='O').length,
  U:bubbles.filter(x=>x.party==='U').length
 };
 return {bubbles,counts,byParty,total:HOUSE_TOTAL,asOf:available?new Date(asOf).toISOString():null,archived,hasSnapshot:Boolean(snapshot&&available)};
}
// Deterministic, evenly spaced columns, with tiny per-district jitter to evoke
// a beeswarm. Circles are not scaled by volume, so each seat carries equal weight.
export function bubbleHash(id){
 let h=2166136261;
 for(const c of String(id)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
 return h>>>0;
}
export function layoutHouseBubbles(distribution){
 const bands=new Map(HOUSE_BANDS.map(b=>[b.id,[]]));
 const unused=[];
 for(const d of distribution.bubbles){
  if(bands.has(d.band))bands.get(d.band).push(d);
  else unused.push(d);
 }
 const nodes=[];
 const start=32,bandWidth=170,originY=313;
 for(const [i,band] of HOUSE_BANDS.entries()){
  const sorted=bands.get(band.id).sort((a,b)=>bubbleHash(a.id)-bubbleHash(b.id)||a.id.localeCompare(b.id));
  const cols=Math.max(2,Math.min(10,Math.round(Math.sqrt(sorted.length*145/350))));
  const rows=Math.ceil(sorted.length/cols);
  // Fit even an extreme 435-seat landslide within the visible plot.
  const step=Math.min(14.6,390/Math.max(1,rows-1));
  const radius=Math.min(5.5,(step-1.5)/2);
  sorted.forEach((d,index)=>{
   const row=Math.floor(index/cols),col=index%cols;
   const h=bubbleHash(d.id),drift=((h%100)/100-.5)*1.3;
   const rowOffset=(row%2?0.30:0)*step;
   const x=start+bandWidth*i+bandWidth/2+(col-(cols-1)/2)*step+rowOffset+drift;
   const y=originY+(row-(rows-1)/2)*step+(((h>>>8)%100)/100-.5)*1.1;
   nodes.push({...d,x,y,r:radius});
  });
 }
 const missing=unused.sort((a,b)=>bubbleHash(a.id)-bubbleHash(b.id)||a.id.localeCompare(b.id));
 const perRow=115;
 missing.forEach((d,i)=>{
  const row=Math.floor(i/perRow),col=i%perRow,parts=Math.min(perRow,missing.length-row*perRow);
  const x=34+(col+.5)*10.1+((perRow-parts)*10.1/2);
  const y=591+row*14.5;
  nodes.push({...d,x,y,r:4.5});
 });
 return nodes;
}
