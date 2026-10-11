import test from 'node:test';
import assert from 'node:assert/strict';
import {raceLeader,leaderColor,marketStateSummary} from '../dist/market-map.mjs';
import {mapMarkup} from '../dist/state-map.mjs';
import {emptyScenario} from '../dist/scenario-core.mjs';
const now=Date.parse('2026-10-12T00:00:00Z');
const candidate=(party,probability)=>({party,probability,active:true,closed:false,name:party,scope:'party'});
const race=(id='GA-S',candidates=[candidate('D',.7),candidate('R',.3)])=>({id,fetchedAt:new Date(now).toISOString(),candidates});
test('fresh leaders map to party and strength without normalizing prices',()=>{
 const l=raceLeader(race(),now);assert.equal(l.party,'D');assert.equal(l.probability,.7);assert.equal(leaderColor(l),'#82a9df');
 assert.equal(raceLeader(race('GA-S',[candidate('I',.8),candidate('D',.1)]),now).party,'O');
});
test('stale, tied, unknown and incomplete markets remain neutral',()=>{
 const bad=[null,{...race(),fetchedAt:new Date(now-7200001).toISOString()},race('GA-S',[candidate('D',.5),candidate('R',.5)]),race('GA-S',[candidate('U',.8),candidate('R',.2)]),race('GA-S',[candidate('D',null),candidate('R',.8)]),race('GA-S',[candidate('R',.8)]),race('GA-S',[{...candidate('D',.7),closed:true},candidate('R',.3)])];
 for(const r of bad)assert.equal(raceLeader(r,now).party,'U');
});
test('House bands count individual district leaders and retain uncovered districts',()=>{
 const s=marketStateSummary('house',{races:[race('GA-01'),race('GA-02',[candidate('R',.95),candidate('D',.05)])]},'GA',now);
 assert.deepEqual(s.counts,{D:1,R:1,O:0,U:12});assert.equal(s.total,14);assert.match(s.text,/Counts, not win probabilities/);
});
test('Senate excludes holdovers and escapes externally supplied candidate names in SVG',()=>{
 assert.equal(marketStateSummary('senate',{races:[]},'VT',now).total,0);
 const r=race();r.candidates[0].name='A "quote" <script>';
 const scenario=emptyScenario(),before=JSON.stringify(scenario);
 const svg=mapMarkup('senate',scenario,'GA',{market:true,summary:code=>marketStateSummary('senate',{races:[r]},code,now)});
 assert.match(svg,/A &quot;quote&quot; &lt;script&gt;/);assert.ok(!svg.includes('<script>'));assert.match(svg,/fill="#82a9df"/);assert.equal(JSON.stringify(scenario),before);
});
