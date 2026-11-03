import test from 'node:test';
import assert from 'node:assert/strict';
import {gaugeAngle,overviewControl,overviewSeats,overviewWatch,percent} from '../dist/election-overview-core.mjs';
import {races} from '../dist/scenario-core.mjs';

const now=Date.parse('2026-11-03T15:00:00Z');
const fresh='2026-11-03T14:58:00Z';
const stale='2026-11-03T11:00:00Z';
const market=(democratic,republican,when=fresh)=>({
  source:'Polymarket',fetchedAt:when,
  parties:{democratic:{probability:democratic,closed:false},republican:{probability:republican,closed:false}}
});
const latest={sources:{polymarket:{senate:market(.68,.33),house:market(.94,.07)},kalshi:{senate:market(.70,.30),house:market(.92,.08)}},errors:{}};

test('gauge keeps probability scale without normalizing independent prices',()=>{
 assert.equal(gaugeAngle(1),-90);
 assert.equal(gaugeAngle(.5),0);
 assert.equal(gaugeAngle(0),90);
 assert.equal(gaugeAngle(null),null);
 assert.equal(gaugeAngle(1.1),null);
 assert.equal(percent(.932),'93.2%');
});

test('cash-market average uses eligible sources for both chambers',()=>{
 const senate=overviewControl(latest,'senate','consensus',now);
 assert.equal(senate.available,true);
 assert.equal(senate.sourceCount,2);
 assert.equal(senate.democratic,.69);
 assert.equal(senate.republican,.315);
 assert.equal(overviewControl(latest,'house','consensus',now).sourceCount,2);
});

test('stale and closed sources are excluded, never shown as current',()=>{
 assert.equal(overviewControl({sources:{polymarket:{senate:market(.8,.2,stale)}}},'senate','polymarket',now).available,false);
 const closed=market(.8,.2);closed.parties.democratic.closed=true;
 assert.equal(overviewControl({sources:{polymarket:{senate:closed}}},'senate','polymarket',now).available,false);
 assert.equal(overviewControl({sources:{}},'house','consensus',now).available,false);
});

test('seat leader totals are derived from the race manifest and retain unknowns',()=>{
 assert.equal(overviewSeats(null,'senate',now),null);
 const sample={races:[]};
 const senate=overviewSeats(sample,'senate',now);
 const house=overviewSeats(sample,'house',now);
 assert.equal(senate.total,100);
 assert.equal(senate.majority,51);
 assert.equal(house.total,435);
 assert.equal(house.majority,218);
 assert.equal(Object.values(senate.counts).reduce((a,b)=>a+b,0),100);
 assert.equal(Object.values(house.counts).reduce((a,b)=>a+b,0),435);
 assert.equal(house.counts.U,435);
});

const sampleRace=(chamber,democratic,republican,when=fresh)=>{
 const r=races(chamber)[0];
 return {id:r.id,state:r.state,chamber,fetchedAt:when,
  url:'https://polymarket.com/event/demo',
  candidates:[
   {name:'Candidate D',label:'Candidate D',party:'D',active:true,closed:false,probability:democratic,image:null},
   {name:'Candidate R',label:'Candidate R',party:'R',active:true,closed:false,probability:republican,image:null}
  ]};
};

test('watchlist includes only fresh comparable close contracts',()=>{
 const sen=sampleRace('senate',.52,.48);
 const house=sampleRace('house',.56,.44);
 const result=overviewWatch({races:[sen,house]},now);
 assert.equal(result.length,2);
 assert.ok(result[0].gapPP<result[1].gapPP);
 assert.equal(result[0].contracts.length,2);
 assert.equal(result[0].url,'https://polymarket.com/event/demo');
 assert.equal(overviewWatch({races:[sampleRace('senate',.55,.45,stale)]},now).length,0);
 assert.equal(overviewWatch({races:[sampleRace('house',.89,.11)]},now).length,0);
});
