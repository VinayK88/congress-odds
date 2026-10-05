import test from 'node:test';
import assert from 'node:assert/strict';
import {STATES} from '../dist/race-data.mjs';
import {races,emptyScenario,seatPartyPreset,tally,validateScenario} from '../dist/scenario-core.mjs';
test('complete, unique 2026 manifest: 50 states, 35 Senate races, 435 House seats',()=>{
 assert.equal(STATES.length,50);assert.equal(new Set(STATES.map(s=>s.code)).size,50);
 assert.equal(new Set(STATES.map(s=>`${s.x},${s.y}`)).size,50);
 for(const [chamber,n] of [['senate',35],['house',435]]){const r=races(chamber);assert.equal(r.length,n);assert.equal(new Set(r.map(s=>s.id)).size,n);}
 assert.deepEqual(STATES.filter(s=>s.special).map(s=>s.code),['FL','OH']);
 assert.equal(races('house','CA').length,52);assert.equal(races('house','TX').length,38);
 assert.equal(races('house','AK')[0].id,'AK-AL');assert.equal(races('senate','CA').length,0);
});
test('empty and current seat-party scenarios conserve all seats',()=>{
 const s=emptyScenario();assert.deepEqual(tally(s,'senate').counts,{D:34,R:31,O:0,U:35});
 assert.deepEqual(tally(s,'house').counts,{D:0,R:0,O:0,U:435});
 s.senate=seatPartyPreset();assert.deepEqual(tally(s,'senate').counts,{D:47,R:53,O:0,U:0});
 assert.equal(tally(s,'senate').control,'R');
});
test('Senate 50–50 tie responds to the VP assumption, including no assumption',()=>{
 const s=emptyScenario();races('senate').forEach((r,i)=>s.senate[r.id]=i<16?'D':'R');
 assert.deepEqual(tally(s,'senate').counts,{D:50,R:50,O:0,U:0});
 assert.equal(tally(s,'senate').control,'R');assert.equal(tally(s,'senate').tie,true);
 s.vp='D';assert.equal(tally(s,'senate').control,'D');
 s.vp='none';assert.equal(tally(s,'senate').control,null);
});
test('outright majority survives unassigned seats; Others do not join a bloc',()=>{
 const s=emptyScenario();races('house').slice(0,218).forEach(r=>s.house[r.id]='D');
 assert.equal(tally(s,'house').control,'D');s.house[races('house')[0].id]='O';assert.equal(tally(s,'house').control,null);
 races('senate').forEach((r,i)=>s.senate[r.id]=i<16?'D':i<34?'R':'O');
 assert.deepEqual(tally(s,'senate').counts,{D:50,R:49,O:1,U:0});assert.equal(tally(s,'senate').control,null);
});
test('import round-trips choices and rejects malformed data without mutation',()=>{
 const s=emptyScenario();s.house['CA-01']='D';s.senate['OH-S']='O';s.house['AK-AL']='U';
 const clean=validateScenario(JSON.parse(JSON.stringify(s)));assert.equal(clean.house['CA-01'],'D');assert.equal(clean.senate['OH-S'],'O');assert.equal(clean.house['AK-AL'],undefined);
 for(const input of [null,{}, {...s,vp:'X'}, {...s,house:[]},{...s,house:{'CA-53':'D'}},{...s,senate:{'CA-S':'R'}},{...s,house:{'CA-01':'toString'}}, JSON.parse('{"version":1,"vp":"R","house":{"__proto__":"D"},"senate":{}}')])assert.throws(()=>validateScenario(input));
 assert.equal(s.house['CA-01'],'D');
});
