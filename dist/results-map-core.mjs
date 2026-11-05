// State-level election result summaries. Called races and market leaders never mix.
import {STATES,HOLDOVERS} from './race-data.mjs';
import {races} from './scenario-core.mjs';
import {selectWinner,countCalls} from './election-calls-core.mjs';
export const RESULT_COLOR=Object.freeze({D:'#235aaa',R:'#b73643',O:'#967a36',U:'#d5deea'});
export function stateResultSummary(chamber,calls,code){
 if(!['house','senate'].includes(chamber))throw Error('Unknown results chamber');
 const state=STATES.find(s=>s.code===code);
 if(!state)throw Error('Unknown state');
 const list=races(chamber,code);
 const counts={D:0,R:0,O:0,U:0};
 const called=[];
 for(const race of list){
  const winner=selectWinner(calls,race.id);
  if(winner){
   counts[winner.party]++;
   called.push({id:race.id,...winner});
  }else counts.U++;
 }
 let fill;
 let text;
 if(!list.length)text=state.name+': no Senate election in 2026; not-up seats are included in chamber totals.';
 else if(chamber==='senate'){
  const winner=called[0];
  if(winner){
   fill=RESULT_COLOR[winner.party];
   text=state.name+': '+winner.name+' — '+(winner.status==='certified'?'certified winner':'called winner')+
    ' ('+winner.party+'). Source: '+winner.source+'.';
  }else{
   fill=RESULT_COLOR.U;
   text=state.name+': Senate result not called in the connected feed. No prediction is shown.';
  }
 }else{
  const total=list.length;
  const calledCount=called.length;
  text=state.name+': '+calledCount+' of '+total+' House districts called · '+counts.D+
   ' Democratic · '+counts.R+' Republican · '+counts.O+' other · '+counts.U+' uncalled.';
  if(!calledCount)fill=RESULT_COLOR.U;
  if(calledCount===total&&new Set(called.map(c=>c.party)).size===1)fill=RESULT_COLOR[called[0].party];
 }
 return {state,total:list.length,counts,called,fill,text,unknown:counts.U};
}
export function resultSeatTotals(chamber,calls){
 if(!['house','senate'].includes(chamber))throw Error('Unknown results chamber');
 const collected=countCalls(calls,chamber);
 const holdovers=chamber==='senate'?{D:HOLDOVERS.D,R:HOLDOVERS.R,O:0,U:0}:{D:0,R:0,O:0,U:0};
 const total=chamber==='senate'?100:435;
 const counts={D:collected.D+holdovers.D,R:collected.R+holdovers.R,O:collected.O,U:total-collected.total-(holdovers.D+holdovers.R)};
 return {chamber,total,counts,called:collected,holdovers,majority:chamber==='senate'?51:218};
}
