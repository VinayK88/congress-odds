import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalRaceId,parseWatchVoteResults,parsePeopleTallyResults,parseCommunityElectionDeskResults,validateCalls,selectWinner,countCalls} from '../dist/election-calls-core.mjs';
import {houseDistribution,senateDistribution} from '../dist/house-swarm-core.mjs';
import {marketStateSummary} from '../dist/market-map.mjs';
import {readFile} from 'node:fs/promises';

const now='2026-11-04T06:20:00.000Z';
const winner=(party,name='Sample Winner')=>({party,name,status:'called',source:'AP calls desk',sourceUrl:'https://apnews.com/hub/election-2026',updatedAt:now});
test('2026 House and Senate district result ids are canonical and constrained',()=>{
 assert.equal(canonicalRaceId('2026-GA-HOUSE-05'),'GA-05');
 assert.equal(canonicalRaceId('H-OH-09'),'OH-09');
 assert.equal(canonicalRaceId('H-AK-AL'),'AK-AL');
 assert.equal(canonicalRaceId('S-OH-sp'),'OH-S');
 assert.equal(canonicalRaceId('2026-GA-SENATE'),'GA-S');
 assert.equal(canonicalRaceId('GA-00'),null);
 assert.equal(canonicalRaceId('XX-02'),null);
 assert.equal(canonicalRaceId('2024-GA-HOUSE-05'),null);
});
test('leading candidates alone can never be labeled election winners',()=>{
 const data=[{raceId:'2026-GA-HOUSE-05',result:{callState:'counting',candidates:[{name:'Candidate A',party:'DEM',winner:false,votes:10000},{name:'Candidate B',party:'REP',winner:false,votes:9500}],source:{authority:'AP',url:'https://apnews.com/hub/election-2026'}}}];
 assert.deepEqual(parseWatchVoteResults(data,now),{});
 data[0].result.callState='called';
 assert.deepEqual(parseWatchVoteResults(data,now),{});
 data[0].result.candidates[0].winner=true;
 assert.equal(parseWatchVoteResults(data,now)['GA-05'].party,'D');
 data[0].result.candidates[1].winner=true;
 assert.deepEqual(parseWatchVoteResults(data,now),{});
});
test('a source-attributed explicit winner can be called, never silently certified',()=>{
 const rows=[{raceId:'2026-NC-SENATE',result:{
  callState:'projected',updatedAt:now,calledBy:'AP',source:{url:'https://apnews.com/hub/election-2026',authority:'Associated Press'},
  candidates:[{winner:true,name:'Winner',party:'Republican'}]
 }}];
 const calls=parseWatchVoteResults(rows,now);
 assert.equal(calls['NC-S'].party,'R');
 assert.equal(calls['NC-S'].status,'called');
});
test('The Peoples Tally parser uses explicit call state and winner flag',()=>{
 const data={races:{
  'H-OH-09':{status:'called',called_by:'AP',url:'https://apnews.com/hub/election-2026',asof:now,
   cands:[{winner:true,name:'Winner',party:'DEM'},{winner:false,name:'Other',party:'REP'}]},
  'S-NC':{status:'counting',cands:[{winner:true,name:'Leading',party:'REP'}]}
 }};
 const calls=parsePeopleTallyResults(data,now);
 assert.equal(Object.keys(calls).length,1);
 assert.equal(calls['OH-09'].party,'D');
});
test('called winner overlays House, Senate and geographic map without altering market leaders',()=>{
 const snapshot={schemaVersion:1,electionYear:2026,checkedAt:now,winners:{
  'GA-01':winner('D','House Winner'),'GA-S':winner('R','Senate Winner')
 }};
 validateCalls(snapshot);
 const house=houseDistribution(null,Date.parse(now),snapshot);
 const senate=senateDistribution(null,Date.parse(now),snapshot);
 assert.equal(house.bubbles.find(b=>b.id==='GA-01').called.party,'D');
 assert.equal(house.bubbles.find(b=>b.id==='GA-02').called,null);
 assert.equal(senate.bubbles.find(b=>b.id==='GA-S').called.party,'R');
 assert.equal(house.bubbles.find(b=>b.id==='GA-01').party,'U','market leader must remain separate');
 assert.equal(countCalls(snapshot,'house').D,1);
 assert.equal(countCalls(snapshot,'senate').R,1);
 const map=marketStateSummary('senate',null,'GA',Date.parse(now),snapshot);
 assert.equal(map.fill,'#b73643');
 assert.match(map.text,/Senate Winner/);
 const houseMap=marketStateSummary('house',null,'GA',Date.parse(now),snapshot);
 assert.notEqual(houseMap.fill,'#235aaa','one House winner is not a statewide House result');
});
test('saved called winner snapshot is valid and source-backed',async()=>{
 const data=JSON.parse(await readFile(new URL('../dist/data/election-calls.json',import.meta.url),'utf8'));
 assert.doesNotThrow(()=>validateCalls(data));
 for(const id of Object.keys(data.winners)){
  assert.ok(selectWinner(data,id));
 }
});

test('community desk contributes only explicit calls, never vote leads',()=>{
 const sample={v:2,drops:[{ts:now}],national:{races:{
  'S-GA':{call:'D',d:100,r:99},
  'H-PA-07':{call:'R',dn:'Candidate D',rn:'Candidate R',d:99,r:101},
  'H-PA-08':{call:'',dn:'Leading D',rn:'Leading R',d:1000000,r:100}
 }}};
 const records=parseCommunityElectionDeskResults(sample,now);
 assert.deepEqual(Object.keys(records).sort(),['GA-S','PA-07']);
 assert.equal(records['GA-S'].party,'D');
 assert.equal(records['PA-07'].party,'R');
 assert.equal(records['PA-07'].name,'Candidate R');
 assert.equal(records['PA-07'].status,'called');
 assert.equal(records['PA-07'].sourceUrl,'https://github.com/lakerainier/election-monitor/blob/main/data/state.json');
});
