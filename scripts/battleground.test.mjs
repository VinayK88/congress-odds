import test from 'node:test';
import assert from 'node:assert/strict';
import {battlegroundRadar} from '../dist/battleground-core.mjs';
const now=Date.parse('2026-10-13T12:00:00Z');
const c=(party,p)=>({party,probability:p,name:party,active:true,closed:false,scope:'party'});
const race=(id,d,r,stamp=now)=>({
 id, chamber:id.endsWith('-S')?'senate':'house',state:id.slice(0,2),
 fetchedAt:new Date(stamp).toISOString(),candidates:[c('D',d),c('R',r)]
});
test('Senate radar ranks only verified fresh Democratic / Republican quotes',()=>{
 const data={races:[race('GA-S',.53,.49),race('TX-S',.56,.44),race('AK-S',.91,.08)]};
 const ranked=battlegroundRadar(data,'senate',now,10);
 assert.equal(ranked.count,1);
 assert.equal(ranked.close[0].id,'GA-S');
 assert.ok(Math.abs(ranked.close[0].gapPP-4)<1e-8);
 assert.equal(ranked.fresh,3);
 assert.equal(ranked.comparable,3);
 assert.equal(ranked.total,35);
 assert.deepEqual(ranked.close[0].contracts.map(x=>x.party),['D','R']);
});
test('range filters select real independent quote spreads without normalizing them',()=>{
 const data={races:[race('GA-S',.53,.49),race('TX-S',.6,.5),race('AK-S',.71,.52)]};
 assert.equal(battlegroundRadar(data,'senate',now,5).count,1);
 assert.equal(battlegroundRadar(data,'senate',now,10).count,2);
 assert.equal(battlegroundRadar(data,'senate',now,20).count,3);
});
test('expired, incomplete, unidentified and same-party top contracts are not ranked',()=>{
 const old=race('GA-S',.51,.49,now-7200001);
 const incomplete=race('TX-S',.50,null);
 const unknown=race('AK-S',.53,.47);unknown.candidates[1].party='U';
 const data={races:[old,incomplete,unknown]};
 const result=battlegroundRadar(data,'senate',now,20);
 assert.equal(result.count,0);
 assert.equal(result.fresh,2);
 assert.equal(result.comparable,0);
});
test('House races are independent districts, not statewide winner probabilities',()=>{
 const data={races:[race('GA-01',.51,.49),race('GA-02',.80,.20)]};
 const result=battlegroundRadar(data,'house',now,5);
 assert.equal(result.close.length,1);
 assert.equal(result.close[0].id,'GA-01');
 assert.equal(result.total,435);
 assert.equal(result.close[0].stateName,'Georgia');
});
test('tied quote prices have no declared leader',()=>{
 const result=battlegroundRadar({races:[race('GA-S',.5,.5)]},'senate',now,5);
 assert.equal(result.count,1);
 assert.equal(result.close[0].leader,'TIED');
 assert.equal(result.close[0].gapPP,0);
});
test('invalid thresholds or chamber are rejected and zero observations remain zero',()=>{
 assert.deepEqual(battlegroundRadar(null,'senate',now,20).count,0);
 assert.throws(()=>battlegroundRadar(null,'president',now,20));
 assert.throws(()=>battlegroundRadar(null,'senate',now,15));
});
