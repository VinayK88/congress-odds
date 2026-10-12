import test from 'node:test';
import assert from 'node:assert/strict';
import {marketGapDescription,markdown} from '../dist/data-core.mjs';
const mkModel=()=>({
 trainedAt:'2026-10-12T05:00:00Z',
 series:{'CONTROLH-2026-D':{
  chamber:'house',party:'Democratic',selectedModel:'baseline',
  benchmarks:{baseline:{name:'No change'}},
  forecast:.62,forecastFor:'2026-10-13T04:00:00Z',
  maePP:2.12,baselineMaePP:2.12,testDays:60
 }}
});
test('near-equal market prices are described as tied, not as a fake lead',()=>{
 assert.match(marketGapDescription(.5,.5),/tied/);
 assert.match(marketGapDescription(.5002,.4998),/tied/);
});
test('different market prices are clearly attributed to market quotes',()=>{
 assert.match(marketGapDescription(.6,.4),/20.0 percentage points in market quotes/);
 assert.match(marketGapDescription(.4,.6),/Republicans lead/);
});
test('README labels expired forecasts and leaves upcoming targets unmarked',()=>{
 const model=mkModel();
 const current=markdown({sources:{}},model,Date.parse('2026-10-12T12:00:00Z'));
 const expired=markdown({sources:{}},model,Date.parse('2026-10-13T05:00:00Z'));
 assert.ok(current.includes('2026-10-13T04:00:00Z |'));
 assert.ok(!current.includes('2026-10-13T04:00:00Z (expired)'));
 assert.ok(expired.includes('2026-10-13T04:00:00Z (expired)'));
});
