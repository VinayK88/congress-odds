import test from 'node:test';
import assert from 'node:assert/strict';
import {stateResultSummary,resultSeatTotals} from '../dist/results-map-core.mjs';
import {mapMarkup} from '../dist/state-map.mjs';
import {emptyScenario} from '../dist/scenario-core.mjs';
import {validateCalls} from '../dist/election-calls-core.mjs';
import {readFile} from 'node:fs/promises';

const timestamp='2026-11-05T07:00:00Z';
const winner=(party,name='Sample winner')=>({party,name,status:'called',source:'Named election desk',
 sourceUrl:'https://apnews.com/projects/elections-2026/us-house-results/',updatedAt:timestamp});
const data=validateCalls({schemaVersion:1,electionYear:2026,checkedAt:timestamp,winners:{
 'GA-S':winner('D','Senate winner'),'GA-01':winner('R','House winner'),
 'GA-02':winner('D','Different winner'),'DE-S':winner('D','Delaware winner')
}});
test('Senate called winners use full-party blue/red and no-contest states are excluded',()=>{
 const ga=stateResultSummary('senate',data,'GA');
 assert.equal(ga.fill,'#235aaa');
 assert.equal(ga.counts.D,1);
 assert.equal(ga.counts.U,0);
 assert.match(ga.text,/Senate winner/);
 const ak=stateResultSummary('senate',data,'AK');
 assert.equal(ak.fill,'#d5deea');
 assert.equal(ak.counts.U,1);
 const ca=stateResultSummary('senate',data,'CA');
 assert.equal(ca.total,0);
 assert.match(ca.text,/no Senate election/);
});
test('House map blends only called wins and uncalled districts, never market prices',()=>{
 const ga=stateResultSummary('house',data,'GA');
 assert.equal(ga.counts.R,1);
 assert.equal(ga.counts.D,1);
 assert.equal(ga.counts.U,ga.total-2);
 assert.equal(ga.fill,undefined,'multi-district partial calls should produce party/uncalled stripes');
 const all=stateResultSummary('house',data,'DE');
 assert.equal(all.total,1);
 assert.equal(all.counts.U,1);
 assert.equal(all.fill,'#d5deea');
 const src=mapMarkup('house',emptyScenario(),'GA',{summary:c=>stateResultSummary('house',data,c),market:true});
 assert.match(src,/state-paint-GA/);
 assert.match(src,/#235aaa/);
 assert.match(src,/#b73643/);
 assert.match(src,/#d5deea/);
});
test('called seat totals include Senate holdovers without hallucinating House wins',()=>{
 const senate=resultSeatTotals('senate',data);
 assert.equal(senate.counts.D,36);
 assert.equal(senate.counts.R,31);
 assert.equal(senate.counts.U,33);
 assert.equal(senate.total,100);
 const house=resultSeatTotals('house',data);
 assert.equal(house.counts.D,1);
 assert.equal(house.counts.R,1);
 assert.equal(house.counts.U,433);
 assert.equal(house.total,435);
});
test('production called snapshot has count consistency and no ungrounded state fills',async()=>{
 const calls=validateCalls(JSON.parse(await readFile(new URL('../dist/data/election-calls.json',import.meta.url),'utf8')));
 for(const chamber of ['house','senate']){
  const totals=resultSeatTotals(chamber,calls);
  assert.equal(Object.values(totals.counts).reduce((a,b)=>a+b,0),totals.total);
  assert.ok(totals.counts.U>=0);
  assert.equal(totals.called.total,totals.called.D+totals.called.R+totals.called.O);
 }
 const wy=stateResultSummary('house',calls,'WY');
 assert.equal(wy.total,1);
 assert.ok(wy.counts.U>=0);
});
