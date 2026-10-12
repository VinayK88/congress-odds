import test from 'node:test';
import assert from 'node:assert/strict';
import {
 emptyRaceHistory,appendRaceSnapshots,validateRaceHistory,
 raceHistorySeries,HISTORY_INTERVAL_SECONDS,HISTORY_RETENTION_SECONDS,HISTORY_MAX_POINTS
} from '../dist/race-history-core.mjs';
const base=Date.parse('2026-10-12T16:00:00Z');
const c=(id,p,party='D')=>({id:String(id),name:'Candidate '+id,label:'Candidate '+id,party,
 scope:'individual',active:true,closed:false,probability:p});
const snapshot=(t,prices=[.66,.33],raceId='GA-S')=>({races:[{
 id:raceId,chamber:'senate',state:'GA',fetchedAt:new Date(t).toISOString(),
 candidates:[c('101',prices[0]),c('202',prices[1],'R')]
}]});
test('empty archive is explicitly empty; no artificial backfill',()=>{
 const blank=emptyRaceHistory();validateRaceHistory(blank,base);
 assert.deepEqual(blank.races,{});
 const {history,additions}=appendRaceSnapshots(blank,snapshot(base),base);
 assert.equal(additions,1);
 assert.equal(history.races['GA-S'].points.length,1);
 assert.deepEqual(raceHistorySeries(history,'GA-S',['101','202'],base),[
  {id:'101',label:'Candidate 101',party:'D',points:[[base/1000,.66]]},
  {id:'202',label:'Candidate 202',party:'R',points:[[base/1000,.33]]}
 ]);
});
test('duplicate, older and high-frequency snapshots never fabricate extra history',()=>{
 const first=appendRaceSnapshots(emptyRaceHistory(),snapshot(base),base).history;
 const duplicate=appendRaceSnapshots(first,snapshot(base),base+30000);
 assert.equal(duplicate.additions,0);
 const tooSoon=appendRaceSnapshots(first,snapshot(base+1200000),base+1200000);
 assert.equal(tooSoon.additions,0);
 const older=appendRaceSnapshots(first,snapshot(base-3600000),base);
 assert.equal(older.additions,0);
 const next=appendRaceSnapshots(first,snapshot(base+HISTORY_INTERVAL_SECONDS*1000,[.7,.25]),base+3600000);
 assert.equal(next.additions,1);
 assert.equal(next.history.races['GA-S'].points.length,2);
 assert.equal(next.history.races['GA-S'].points[1][2],.7);
});
test('history retains stable contract identifiers and filters by actual time window',()=>{
 const h1=appendRaceSnapshots(emptyRaceHistory(),snapshot(base),base).history;
 const h2=appendRaceSnapshots(h1,snapshot(base+3600000,[.8,.19]),base+3600000).history;
 const ids=['101','202'];
 assert.equal(raceHistorySeries(h2,'GA-S',ids,base+3600000,24)[0].points.length,2);
 assert.equal(raceHistorySeries(h2,'GA-S',ids,base+3600000,0.5)[0].points.length,1);
 assert.deepEqual(raceHistorySeries(h2,'ZZ-S',ids,base+3600000),[]);
});
test('expired observations are removed without manufacturing interpolation',()=>{
 const h1=appendRaceSnapshots(emptyRaceHistory(),snapshot(base),base).history;
 const newer=appendRaceSnapshots(h1,snapshot(base+HISTORY_RETENTION_SECONDS*1000+3600000,[.58,.42]),base+HISTORY_RETENTION_SECONDS*1000+3600000).history;
 assert.equal(newer.races['GA-S'].points.length,1);
 assert.equal(newer.races['GA-S'].points[0][2],.58);
});
test('bad quotes and unknown races are never stored',()=>{
 const missing=snapshot(base);missing.races[0].candidates[1].probability=null;
 assert.equal(appendRaceSnapshots(emptyRaceHistory(),missing,base).additions,0);
 assert.equal(appendRaceSnapshots(emptyRaceHistory(),snapshot(base,[.6,.4],'XX-S'),base).additions,0);
});
test('validator rejects malformed or synthetic archives',()=>{
 const h=appendRaceSnapshots(emptyRaceHistory(),snapshot(base),base).history;
 for(const mutate of [
  x=>x.races['GA-S'].points.push(x.races['GA-S'].points[0]),
  x=>x.races['GA-S'].points[0][2]=1.4,
  x=>x.races['GA-S'].points[0][1]='javascript:alert(1)',
  x=>x.races['GA-S'].points[0][0]=Math.floor(base/1000)+600,
  x=>delete x.races['GA-S'].contracts['101'],
  x=>x.races['XX-S']=x.races['GA-S'],
  x=>x.races['GA-S'].contracts['101'].label='<'.repeat(151)
 ]){
  const broken=structuredClone(h);mutate(broken);
  assert.throws(()=>validateRaceHistory(broken,base));
 }
 assert.equal(HISTORY_MAX_POINTS,168);
});
