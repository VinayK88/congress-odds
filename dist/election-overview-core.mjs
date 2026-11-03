// Compact midterm overview: market prices are not certified election outcomes.
import {consensus,isStale} from './data-core.mjs';
import {marketTotals} from './market-map.mjs';
import {battlegroundRadar} from './battleground-core.mjs';

export const percent=value=>Number.isFinite(value)?(value*100).toFixed(1)+'%':'—';
export const gaugeAngle=value=>Number.isFinite(value)&&value>=0&&value<=1?(0.5-value)*180:null;

export function overviewControl(latest,chamber,source='consensus',now=Date.now()){
 if(!['house','senate'].includes(chamber))throw Error('Unsupported chamber');
 const cash=source==='consensus';
 const record=cash?consensus(latest||{sources:{}},chamber,now):latest?.sources?.[source]?.[chamber];
 const valid=record&&(!cash?(!isStale(record,now)):true)&&
  ['democratic','republican'].every(p=>Number.isFinite(record.parties?.[p]?.probability)&&
    record.parties[p].probability>=0&&record.parties[p].probability<=1&&
    (cash||record.parties[p].closed===false));
 if(!valid)return {chamber,source,available:false,democratic:null,republican:null};
 return {
  chamber,source,available:true,
  democratic:record.parties.democratic.probability,
  republican:record.parties.republican.probability,
  sourceLabel:cash?'Cash-market average':source==='manifold'?'Manifold · play money':record.source||source,
  sourceCount:cash?record.included.length:1,
  updatedAt:cash?record.included.reduce((latest,c)=>!latest||Date.parse(c.fetchedAt)>Date.parse(latest)?c.fetchedAt:latest,null):record.fetchedAt
 };
}

export function overviewSeats(snapshot,chamber,now=Date.now()){
 if(!snapshot||!Array.isArray(snapshot.races))return null;
 const totals=marketTotals(chamber,snapshot,now);
 if(Object.values(totals.counts).reduce((a,b)=>a+b,0)!==totals.total)throw Error('Seat totals do not match chamber size');
 return totals;
}

export function overviewWatch(snapshot,now=Date.now(),max=5){
 if(!snapshot||!Array.isArray(snapshot.races))return [];
 const byId=new Map(snapshot.races.map(r=>[r.id,r]));
 const senate=battlegroundRadar(snapshot,'senate',now,20).closest.filter(r=>r.gapPP<=20).slice(0,3);
 const house=battlegroundRadar(snapshot,'house',now,20).closest.filter(r=>r.gapPP<=20).slice(0,3);
 return [...senate,...house].sort((a,b)=>a.gapPP-b.gapPP||a.id.localeCompare(b.id)).slice(0,max)
  .map(r=>{
   const source=byId.get(r.id);
   const contracts=r.contracts.map(c=>{
    const candidate=source.candidates.find(x=>x.party===c.party&&
      (x.name||x.label)===(c.name||''))||source.candidates.find(x=>x.party===c.party&&x.probability===c.price);
    return {...c,image:candidate?.image||null};
   });
   return {...r,contracts,url:source.url};
  });
}
