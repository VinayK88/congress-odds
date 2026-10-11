import {STATES} from './race-data.mjs';
import {races} from './scenario-core.mjs';
import {candidateFresh} from './candidate-core.mjs';
export const MARKET_COLORS={D:['#bed3f3','#82a9df','#477bc3','#235aaa'],R:['#efc1c7','#df8e99','#c95868','#b73643'],O:['#e2d9bd','#c6b787','#a5915c','#82724d'],U:'#d7d5ce'};
export function raceLeader(race,now=Date.now()){
 const neutral=reason=>({party:'U',probability:null,reason,candidate:null});
 if(!race)return neutral('No market data');
 if(!candidateFresh(race,now))return neutral('Stale snapshot');
 const active=race.candidates.filter(c=>c.active&&!c.closed);
 if(active.length<2||active.some(c=>!Number.isFinite(c.probability)))return neutral('Incomplete or unavailable quotes');
 const sorted=[...active].sort((a,b)=>b.probability-a.probability),leader=sorted[0];
 if(Math.abs(leader.probability-sorted[1].probability)<1e-9)return neutral('Tied market leaders');
 if(leader.party==='U')return neutral('Leading candidate party not supplied');
 return {party:['D','R'].includes(leader.party)?leader.party:'O',probability:leader.probability,reason:null,candidate:leader};
}
export function leaderColor(leader){
 if(leader.party==='U')return MARKET_COLORS.U;
 const p=leader.probability;return MARKET_COLORS[leader.party][p>=.95?3:p>=.8?2:p>=.6?1:0];
}
export function marketStateSummary(chamber,snapshot,code,now=Date.now()){
 const state=STATES.find(s=>s.code===code),rr=races(chamber,code),counts={D:0,R:0,O:0,U:0};
 const marketById=new Map((snapshot?.races||[]).map(r=>[r.id,r]));
 const leaders=rr.map(r=>({id:r.id,...raceLeader(marketById.get(r.id),now)}));
 leaders.forEach(l=>counts[l.party]++);
 let text=`${state.name}: no 2026 Senate contest`,fill;
 if(chamber==='house')text=`${state.name}: district market leaders — ${counts.D} Democratic, ${counts.R} Republican, ${counts.O} other, ${counts.U} unclear or unavailable. Counts, not win probabilities.`;
 else if(leaders.length){const l=leaders[0];fill=leaderColor(l);text=l.party==='U'?`${state.name}: ${l.reason}`:`${state.name}: ${l.candidate.name||l.candidate.label} leads at ${(l.probability*100).toFixed(1)}% (${l.candidate.scope==='party'?'party / nominee':'individual'} contract).`;}
 return {state,counts,total:rr.length,text,fill,leaders};
}
