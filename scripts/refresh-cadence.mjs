// One lightweight CI gate prevents expensive data-fetch/model jobs outside
// the phase's planned time. Delays from GitHub's scheduler are possible.
import {appendFile,readFile} from 'node:fs/promises';
import {refreshCadence,scheduledSlotDue,snapshotDue,formatMinutes} from '../dist/refresh-cadence.mjs';
const now=new Date(),tier=refreshCadence(now),event=process.env.GITHUB_EVENT_NAME||'workflow_dispatch';
// Exact-minute modulo gates drop delayed GitHub schedules; persisted snapshot
// retrieval times are a better source of truth. Manual/push runs still force.
async function lastMarketTime(){
 try{
  const data=JSON.parse(await readFile(new URL('../dist/data/latest.json',import.meta.url),'utf8'));
  const times=Object.values(data.sources||{}).flatMap(chambers=>Object.values(chambers||{}))
    .map(x=>Date.parse(x?.fetchedAt)).filter(Number.isFinite);
  return times.length?new Date(Math.max(...times)).toISOString():null;
 }catch{return null;}
}
async function lastCandidateTime(){
 try{
  const data=JSON.parse(await readFile(new URL('../dist/data/candidates.json',import.meta.url),'utf8'));
  return data.updatedAt||null;
 }catch{return null;}
}
const marketSeen=await lastMarketTime(),candidateSeen=await lastCandidateTime();
const run=event!=='schedule'||snapshotDue(marketSeen,tier.publishMinutes,now);
const candidates=run&&(event!=='schedule'||snapshotDue(candidateSeen,tier.profilesMinutes,now));
let model=false;
if(run && tier.phase!=='Post-election archive' && tier.phase!=='Post-election verification'){
 if(event==='workflow_dispatch')model=true;
 else {
  try {
   const saved=JSON.parse(await readFile(new URL('../dist/data/model.json',import.meta.url),'utf8'));
   const targets=Object.values(saved.series||{}).map(x=>Date.parse(x.forecastFor));
   const expired=targets.length!==4||targets.some(t=>!Number.isFinite(t)||t<=now.getTime());
   // Even in five-minute election mode, train at most once each hourly slot.
   // Avoid repeated expensive attempts while the next daily candle is pending.
   model=expired&&(event!=='schedule'||scheduledSlotDue(60,now));
  } catch {model=true;}
 }
}
const values={run,candidates,model,publish_minutes:tier.publishMinutes,profiles_minutes:tier.profilesMinutes};
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,Object.entries(values).map(([key,value])=>key+'='+String(value)).join('\n')+'\n');
console.log(`${tier.phase} (${now.toISOString()}): market ${formatMinutes(tier.publishMinutes)}, candidate profiles ${formatMinutes(tier.profilesMinutes)}; market last=${marketSeen||'none'}, profiles last=${candidateSeen||'none'}; run=${run}, candidates=${candidates}, train=${model}. GitHub schedule times are best effort.`);
