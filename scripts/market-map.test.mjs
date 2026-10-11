import test from 'node:test';
import assert from 'node:assert/strict';
import {raceLeader,leaderColor,marketStateSummary,marketTotals} from '../dist/market-map.mjs';
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

test('market totals include Senate holdovers exactly once and count unclear races separately',()=>{
 const snapshot={races:[race(),race('TX-S',[candidate('R',.6),candidate('D',.4)])]};
 const s=marketTotals('senate',snapshot,now);
 assert.deepEqual(s.counts,{D:35,R:32,O:0,U:33});assert.equal(Object.values(s.counts).reduce((a,b)=>a+b),100);
 assert.deepEqual(marketTotals('senate',snapshot,now+7200001).counts,{D:34,R:31,O:0,U:35});
});
test('House tally matches the sum of state bands and accounts for every voting seat',()=>{
 const snapshot={races:[race('GA-01'),race('GA-02',[candidate('I',.8),candidate('R',.2)])]};
 const h=marketTotals('house',snapshot,now);assert.deepEqual(h.counts,{D:1,R:0,O:1,U:433});assert.equal(h.majority,218);
 assert.deepEqual(marketTotals('house',null,now).counts,{D:0,R:0,O:0,U:435});
});
