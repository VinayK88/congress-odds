import test from 'node:test';
import assert from 'node:assert/strict';
import {identifyRace,parseCandidateEvent,preferRace,validateCandidates,candidateFresh,safePhoto} from '../dist/candidate-core.mjs';
const now='2026-10-11T16:00:00Z';
const market=(overrides={})=>({id:'123',groupItemTitle:'Example Candidate (D)',slug:'will-the-democrats-win',question:'Will the Democrats win the Georgia Senate race in 2026?',active:true,closed:false,acceptingOrders:true,outcomes:'["No","Yes"]',outcomePrices:'["0.3","0.7"]',image:'https://polymarket-upload.s3.us-east-2.amazonaws.com/example.jpg',...overrides});
const event=(overrides={})=>({id:'456',title:'Georgia Senate Election Winner',slug:'georgia-senate-election-winner',endDate:'2026-11-04T04:59:00Z',active:true,closed:false,volume:100,markets:[market()],...overrides});
const snapshot=()=>({schemaVersion:1,electionYear:2026,updatedAt:now,races:[parseCandidateEvent(event(),now)]});
test('race identity excludes primaries, margins, other cycles and invalid districts',()=>{
 assert.equal(identifyRace(event()).id,'GA-S');
 for(const title of ['Georgia Senate Primary Winner','Georgia Senate Election Margin of Victory','CA-99 House Election Winner','Vermont Senate Election Winner'])assert.equal(identifyRace(event({title})),null);
 assert.equal(identifyRace(event({endDate:'2028-11-04'})),null);
 assert.equal(identifyRace(event({title:'AK-AL House Election Winner'})).id,'AK-AL');
});
test('candidate names preserve party contract scope and find Yes regardless of index',()=>{
 const c=parseCandidateEvent(event(),now).candidates[0];assert.equal(c.name,'Example Candidate');assert.equal(c.party,'D');assert.equal(c.scope,'party');assert.equal(c.probability,.7);
 const r=parseCandidateEvent(event({markets:[market({groupItemTitle:'Person A'}),market({id:'124',groupItemTitle:'Republican Party'}),market({id:'125',groupItemTitle:'Another Person',question:'Will Another Person win?'})]}),now);
 assert.equal(r.candidates.length,2);assert.equal(r.candidates[0].name,null);assert.equal(r.candidates[0].party,'R');assert.equal(r.candidates[0].image,null);assert.equal(r.candidates[1].party,'U');assert.equal(r.candidates[1].scope,'individual');
});
test('invalid, missing, closed and paused odds never become false current probabilities',()=>{
 for(const override of [{outcomePrices:'["0.3",true]'},{outcomePrices:'["0.3",null]'},{outcomePrices:'["0.3",""]'},{outcomePrices:'["0.3","2"]'},{outcomes:'["No","Maybe"]'},{closed:true},{acceptingOrders:false}])assert.equal(parseCandidateEvent(event({markets:[market(override)]}),now).candidates[0].probability,null);
 assert.equal(parseCandidateEvent(event({markets:[market({outcomePrices:'["1","0"]'})]}),now).candidates[0].probability,0);
});
test('direct candidate contract takes priority over same-race party market',()=>{
 const party=parseCandidateEvent(event({title:'CA-40 House Election Winner'}),now);
 const individual=parseCandidateEvent(event({title:'CA-40 House Election Winner (Individual)',markets:[market({groupItemTitle:'Named Person',question:'Will Named Person win the CA-40 House seat?'})]}),now);
 assert.equal(preferRace(party,individual),individual);assert.equal(preferRace(individual,party),individual);
});
test('candidate validator rejects unsafe photos, duplicate races, invalid odds and future times',()=>{
 validateCandidates(snapshot(),Date.parse(now));
 const mutations=[s=>s.races.push(s.races[0]),s=>s.races[0].candidates[0].image='https://evil.example/x',s=>s.races[0].candidates[0].probability=2,s=>s.races[0].candidates[0].url='javascript:alert(1)',s=>s.races[0].fetchedAt='2030-01-01',s=>s.races[0].chamber='house'];
 for(const mutate of mutations){const s=snapshot();mutate(s);assert.throws(()=>validateCandidates(s,Date.parse(now)));}
 assert.equal(safePhoto('https://polymarket-upload.s3.us-east-2.amazonaws.com.evil.example/x'),null);
});
test('staleness is determined from each race retrieval, not global snapshot time',()=>{
 const r=snapshot().races[0];assert.equal(candidateFresh(r,Date.parse(now)+3600000),true);assert.equal(candidateFresh(r,Date.parse(now)+7200001),false);
});
