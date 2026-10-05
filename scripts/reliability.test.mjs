import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateLatest,validateModel,validateHistory,mergeLatest,fetchJson} from '../dist/reliability.mjs';
import {isStale} from '../dist/data-core.mjs';
import {emptyScenario} from '../dist/scenario-core.mjs';
import {createScenarioHistory} from '../dist/scenario-history.mjs';
const fixture=name=>JSON.parse(readFileSync(new URL(`../dist/data/${name}.json`,import.meta.url)));
const latest=fixture('latest');
test('market snapshots reject malformed probabilities, future dates and unsafe links',()=>{
 const now=Date.now();assert.doesNotThrow(()=>validateLatest(latest,now));
 for(const edit of [c=>c.parties.democratic.probability=1.2,c=>c.parties.democratic.probability='0.5',c=>delete c.parties.republican,c=>c.fetchedAt=new Date(now+600000).toISOString(),c=>c.url='javascript:alert(1)',c=>c.url='https://polymarket.com.evil.example/']){
  const v=structuredClone(latest);edit(v.sources.polymarket.house);assert.throws(()=>validateLatest(v,now));
 }
 const future={fetchedAt:new Date(now+600000).toISOString()};assert.equal(isStale(future,now),true);
});
test('a saved snapshot cannot overwrite a newer live quote or refresh its timestamp',()=>{
 const old=structuredClone(latest),newer=structuredClone(latest),date=new Date(Date.parse(old.sources.polymarket.house.fetchedAt)+60000).toISOString();
 newer.sources.polymarket.house.fetchedAt=date;newer.sources.polymarket.house.parties.democratic.probability=.42;
 const result=mergeLatest(newer,old);assert.equal(result.sources.polymarket.house.parties.democratic.probability,.42);assert.equal(result.sources.polymarket.house.fetchedAt,date);
 assert.notEqual(old.sources.polymarket.house.parties.democratic.probability,.42);
});
test('model and history validation catches incomplete, invalid and out-of-order chart data',()=>{
 assert.doesNotThrow(()=>validateModel(fixture('model')));assert.doesNotThrow(()=>validateHistory(fixture('history')));
 const history=fixture('history');history.series['CONTROLH-2026-D'][1].t=history.series['CONTROLH-2026-D'][0].t;assert.throws(()=>validateHistory(history));
 for(const mutate of [m=>m.benchmarks.baseline.backtest=[],m=>m.maePP=null,m=>m.forecastFor=m.dataThrough,m=>m.selectionEnd=m.testEnd,m=>m.benchmarks.ridge.backtest[0].predicted=NaN]){const v=fixture('model');mutate(v.series['CONTROLH-2026-D']);assert.throws(()=>validateModel(v));}
});
test('transient requests retry with backoff; permanent errors do not',async()=>{
 let attempts=0;const delays=[];
 const value=await fetchJson('test',{sleep:async ms=>delays.push(ms),fetcher:async()=>++attempts===1?{ok:false,status:503}:{ok:true,json:async()=>({ok:true})}});
 assert.deepEqual(value,{ok:true});assert.equal(attempts,2);assert.deepEqual(delays,[500]);
 attempts=0;await assert.rejects(fetchJson('test',{fetcher:async()=>{attempts++;return {ok:false,status:404};}}),/404/);assert.equal(attempts,1);
});
test('timeouts bound stalled connections and stalled JSON bodies',async()=>{
 let signal;
 await assert.rejects(fetchJson('test',{attempts:1,timeoutMs:10,fetcher:async(_,options)=>{signal=options.signal;return new Promise(()=>{});}}),/timed out/);assert.equal(signal.aborted,true);
 await assert.rejects(fetchJson('test',{attempts:1,timeoutMs:10,fetcher:async()=>({ok:true,json:()=>new Promise(()=>{})})}),/timed out/);
});
test('invalid JSON does not trigger retry storms',async()=>{
 let calls=0;await assert.rejects(fetchJson('test',{fetcher:async()=>{calls++;return {ok:true,json:async()=>{throw new SyntaxError('Invalid JSON');}};}}),SyntaxError);assert.equal(calls,1);
});
test('undo and redo recover clearing/imports, isolate mutable objects and discard redo after a new edit',()=>{
 const initial=emptyScenario(),history=createScenarioHistory(initial);assert.equal(history.canUndo,false);
 const first=emptyScenario();first.house['CA-01']='D';history.commit(first);first.house['CA-01']='R';
 assert.deepEqual(history.undo(),initial);assert.equal(history.canRedo,true);assert.equal(history.redo().house['CA-01'],'D');
 history.commit(emptyScenario());assert.equal(history.undo().house['CA-01'],'D');
 const next=history.undo();next.senate['TX-S']='R';history.commit(next);assert.equal(history.canRedo,false);
 assert.throws(()=>history.commit({...emptyScenario(),house:{'CA-99':'R'}}));assert.equal(history.undo().house['CA-01'],undefined);
});
test('scenario recovery history is bounded',()=>{
 const history=createScenarioHistory(emptyScenario(),2);
 for(const vp of ['D','none','R']){const s=emptyScenario();s.vp=vp;history.commit(s);}
 assert.equal(history.undo().vp,'none');assert.equal(history.undo().vp,'D');assert.equal(history.canUndo,false);
});
