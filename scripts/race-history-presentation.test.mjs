import test from 'node:test';
import assert from 'node:assert/strict';
import {recordedPriceMovement,movementText} from '../dist/race-history-presentation.mjs';
const entry={
 contracts:{'11':{label:'Alice',party:'D'},'22':{label:'Bob',party:'R'}},
 points:[[1000,'11',.60,'22',.35],[4600,'11',.625,'22',.325],[8200,'11',.71,'22',.25]]
};
test('first genuine recorded snapshot shows real prices, never made-up movement',()=>{
 const v=recordedPriceMovement(entry,8200);
 assert.equal(v.points.length,1);
 assert.deepEqual(v.contracts.map(x=>x.latest),[.71,.25]);
 assert.deepEqual(v.contracts.map(x=>x.deltaPP),[null,null]);
 assert.deepEqual(v.contracts.map(x=>x.sampleCount),[1,1]);
 assert.equal(movementText(v.contracts[0].deltaPP),'Baseline only');
});
test('time window updates movement and first/last inspected quotes independently',()=>{
 const v=recordedPriceMovement(entry,4600);
 assert.equal(v.points.length,2);
 assert.ok(Math.abs(v.contracts[0].deltaPP-8.5)<1e-9);
 assert.ok(Math.abs(v.contracts[1].deltaPP+7.5)<1e-9);
 assert.equal(movementText(v.contracts[0].deltaPP),'↑ +8.5 pp');
 assert.equal(movementText(v.contracts[1].deltaPP),'↓ −7.5 pp');
});
test('contract replacement does not splice another candidate’s price into a trend',()=>{
 const next=structuredClone(entry);
 next.contracts['33']={label:'Carol',party:'U'};
 next.points[2]=[8200,'33',.8,'22',.2];
 const v=recordedPriceMovement(next,0);
 assert.equal(v.contracts[0].id,'33');
 assert.equal(v.contracts[0].sampleCount,1);
 assert.equal(v.contracts[0].deltaPP,null);
 assert.equal(v.contracts[1].sampleCount,3);
});
test('empty range, absence of history and tiny changes have neutral labels',()=>{
 assert.deepEqual(recordedPriceMovement(entry,9000),{points:[],contracts:[]});
 assert.deepEqual(recordedPriceMovement(null),{points:[],contracts:[]});
 assert.equal(movementText(.04),'No visible change');
 assert.equal(movementText(-.04),'No visible change');
 assert.equal(movementText(NaN),'Baseline only');
});
