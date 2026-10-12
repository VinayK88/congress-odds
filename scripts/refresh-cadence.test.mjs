import test from 'node:test';
import assert from 'node:assert/strict';
import {electionDateET,refreshCadence,scheduledSlotDue,formatMinutes} from '../dist/refresh-cadence.mjs';
const at=s=>refreshCadence(new Date(s));
test('countdown phases follow the US Eastern calendar, including the DST change',()=>{
 assert.equal(at('2026-10-12T12:00:00Z').publishMinutes,60);
 assert.equal(at('2026-10-20T04:00:00Z').publishMinutes,30);
 assert.equal(at('2026-10-27T04:00:00Z').publishMinutes,15);
 assert.equal(at('2026-11-01T03:59:00Z').publishMinutes,15);
 assert.equal(at('2026-11-01T04:00:00Z').publishMinutes,5);
 assert.equal(electionDateET(new Date('2026-11-03T17:00:00Z')),'2026-11-03');
 assert.equal(at('2026-11-04T04:59:00Z').publishMinutes,5);
 assert.equal(at('2026-11-04T05:00:00Z').publishMinutes,60);
 assert.equal(at('2026-11-11T05:00:00Z').publishMinutes,360);
});
test('browser/profile polling ramps up, model cadence stays separate',()=>{
 assert.equal(at('2026-10-20T15:00:00Z').browserMinutes,3);
 assert.equal(at('2026-10-28T15:00:00Z').profilesMinutes,30);
 assert.equal(at('2026-11-03T15:00:00Z').browserMinutes,1);
 assert.equal(at('2026-11-03T15:00:00Z').profilesMinutes,15);
});
test('planned schedule slots are distinct and obey 5/15/30/60/360 minute gates',()=>{
 const slot=min=>new Date('2026-10-28T12:'+String(min).padStart(2,'0')+':00Z');
 for(const min of [2,7,12,17,22,27,32,37,42,47,52,57])assert.equal(scheduledSlotDue(5,slot(min)),true);
 assert.equal(scheduledSlotDue(60,slot(2)),true);
 assert.equal(scheduledSlotDue(60,slot(32)),false);
 assert.equal(scheduledSlotDue(30,slot(32)),true);
 assert.equal(scheduledSlotDue(15,slot(17)),true);
 assert.equal(scheduledSlotDue(15,slot(22)),false);
 assert.equal(scheduledSlotDue(360,new Date('2026-11-11T06:02:00Z')),true);
 assert.equal(scheduledSlotDue(360,new Date('2026-11-11T07:02:00Z')),false);
 assert.throws(()=>scheduledSlotDue(3,slot(2)));
});
test('cadence description is meaningful in dashboard',()=>{
 assert.equal(formatMinutes(60),'hourly');
 assert.equal(formatMinutes(15),'every 15 minutes');
 assert.equal(formatMinutes(360),'every 6 hours');
});
