import test from 'node:test';
import assert from 'node:assert/strict';
import {briefingForState} from '../dist/state-briefing.mjs';
const now=Date.parse('2026-10-12T16:00:00Z');
const quote=(party,p,label,opts={})=>({
 label,name:label,party,probability:p,active:true,closed:false,
 scope:'individual',image:null,url:'https://polymarket.com/event/example/contract',...opts
});
const make=(id,chamber='senate',candidates=[
 quote('D',.74,'Candidate A'),quote('R',.21,'Candidate B')
])=>({id,chamber,state:id.slice(0,2),fetchedAt:new Date(now).toISOString(),candidates,
 url:'https://polymarket.com/event/example',volume:1000});
test('fresh Senate briefing has two independently quoted market options and source timestamps',()=>{
 const race=make('GA-S');
 const view=briefingForState('senate','GA',null,{races:[race]},now);
 assert.equal(view.state,'Georgia');
 assert.equal(view.raceId,'GA-S');
 assert.equal(view.total,1);
 assert.equal(view.isFresh,true);
 assert.equal(view.contracts.length,2);
 assert.equal(view.contracts[0].probability,.74);
 assert.equal(view.contracts[1].probability,.21);
 assert.equal(view.contracts[0].label,'Candidate A');
 assert.equal(view.counts.D,1);
 assert.equal(view.sourceUrl,race.url);
});
test('no Senate contest shows a clean empty state, not synthetic candidate odds',()=>{
 const view=briefingForState('senate','CA',null,{races:[]},now);
 assert.equal(view.total,0);
 assert.equal(view.raceId,null);
 assert.deepEqual(view.contracts,[]);
 assert.equal(view.sourceUrl,null);
});
test('expired quotes are hidden even when previously present',()=>{
 const old=make('GA-S');
 old.fetchedAt=new Date(now-7200001).toISOString();
 const view=briefingForState('senate','GA',null,{races:[old]},now);
 assert.equal(view.isFresh,false);
 assert.deepEqual(view.contracts,[]);
 assert.equal(view.reason,'Stale snapshot');
 assert.equal(view.retrievedAt,old.fetchedAt);
});
test('house selection reflects chosen district and counts known and unknown market leads',()=>{
 const first=make('GA-01','house');
 const next=make('GA-02','house',[quote('R',.63,'Candidate C'),quote('D',.35,'Candidate D')]);
 const snap={races:[first,next]};
 const view=briefingForState('house','GA','GA-02',snap,now);
 assert.equal(view.raceId,'GA-02');
 assert.equal(view.total,14);
 assert.deepEqual(view.counts,{D:1,R:1,O:0,U:12});
 assert.equal(view.contracts[0].label,'Candidate C');
 assert.equal(view.contracts[0].party,'Republican');
});
test('unknown candidate parties remain explicitly unknown and safe images are checked',()=>{
 const mystery=make('AK-S','senate',[
 quote('U',.9,'Example Candidate',{image:'javascript:alert(1)'}),
 quote('U',.1,'Other Candidate')
 ]);
 const view=briefingForState('senate','AK',null,{races:[mystery]},now);
 assert.equal(view.contracts[0].party,'Party not supplied');
 assert.equal(view.contracts[0].image,null);
 assert.equal(view.reason,'Leading candidate party not supplied');
 assert.throws(()=>briefingForState('senate','XX',null,{races:[]},now));
});
