import test from 'node:test';
import assert from 'node:assert/strict';
import {marketLeaderFlips,flipLabel,partyName} from '../dist/market-flips.mjs';
const NOW=Date.parse('2026-10-13T12:00:00Z');
const ts=hoursAgo=>Math.floor(NOW/1000)-hoursAgo*3600;
const record=(parts=[[-3,'d',.60,'r',.40],[-2,'r',.55,'d',.45],[-1,'r',.62,'d',.38]])=>({
 contracts:{d:{party:'D'},r:{party:'R'},u:{party:'U'}},
 points:parts.map(([h,a,pa,b,pb])=>[ts(-h),a,pa,b,pb])
});
const archive=(entries)=>({races:entries});
test('one observation never creates a fake flip',()=>{
 const result=marketLeaderFlips(archive({'GA-S':record([[-1,'d',.7,'r',.3]])}),'senate',NOW,24);
 assert.equal(result.flippedRaces,0);
 assert.equal(result.events,0);
 assert.equal(result.compared,0);
 assert.equal(result.insufficient,35);
});
test('detects a verified Democratic to Republican Senate market-leader switch',()=>{
 const result=marketLeaderFlips(archive({'GA-S':record()}),'senate',NOW,24);
 assert.equal(result.flippedStates,1);
 assert.equal(result.flippedRaces,1);
 assert.equal(result.events,1);
 assert.equal(result.states.GA.to,'R');
 assert.equal(result.flips[0].raceId,'GA-S');
 assert.equal(flipLabel(result.flips[0]),'Democratic → Republican');
 assert.equal(result.flips[0].leaderPrice,.55);
});
test('ignores tie and unknown-party transitions without bridging across missing labels',()=>{
 const pts=[[-4,'d',.7,'r',.3],[-3,'u',.8,'d',.2],[-2,'r',.6,'d',.4],[-1,'r',.5,'d',.5]];
 const result=marketLeaderFlips(archive({'GA-S':record(pts)}),'senate',NOW,24);
 assert.equal(result.flippedRaces,0);
 assert.equal(result.compared,0);
});
test('detects individual House district flips without calling every district a state flip',()=>{
 const result=marketLeaderFlips(archive({
  'GA-01':record(),
  'GA-02':record([[-3,'r',.7,'d',.3],[-2,'d',.6,'r',.4]]),
  'TX-01':record([[-2,'d',.8,'r',.2],[-1,'d',.7,'r',.3]])
 }),'house',NOW,24);
 assert.equal(result.flippedRaces,2);
 assert.equal(result.flippedStates,1);
 assert.equal(result.states.GA.count,2);
 assert.equal(result.states.TX,undefined);
 assert.equal(result.compared,3);
});
test('24-hour vs 7-day lens only compares observations in the requested window',()=>{
 const h=record([[-70,'d',.7,'r',.3],[-69,'r',.6,'d',.4],[-1,'r',.65,'d',.35]]);
 const lastDay=marketLeaderFlips(archive({'GA-S':h}),'senate',NOW,24);
 assert.equal(lastDay.flippedStates,0);
 const seven=marketLeaderFlips(archive({'GA-S':h}),'senate',NOW,168);
 assert.equal(seven.flippedStates,1);
 assert.equal(seven.flips[0].at,ts(69));
});
test('multiple changes count distinct events without inflating state count',()=>{
 const h=record([[-4,'d',.7,'r',.3],[-3,'r',.8,'d',.2],[-2,'d',.9,'r',.1],[-1,'d',.85,'r',.15]]);
 const res=marketLeaderFlips(archive({'GA-S':h}),'senate',NOW,24);
 assert.equal(res.events,2);assert.equal(res.flippedRaces,1);
 assert.equal(res.flips[0].switches,2);
 assert.equal(res.flips[0].from,'R');assert.equal(res.flips[0].to,'D');
 assert.equal(partyName('U'),'Unknown');
});
test('bad chamber and unsupported windows reject instead of fabricating history',()=>{
 assert.throws(()=>marketLeaderFlips({},'president',NOW));
 assert.throws(()=>marketLeaderFlips({},'senate',NOW,72));
});
