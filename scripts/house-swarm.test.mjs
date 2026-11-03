import test from 'node:test';
import assert from 'node:assert/strict';
import {HOUSE_BANDS,HOUSE_TOTAL,houseBand,houseDistribution,layoutHouseBubbles,layoutRaceBubbles} from '../dist/house-swarm-core.mjs';
import {races} from '../dist/scenario-core.mjs';

const now=Date.parse('2026-11-03T23:30:00Z');
const manifest=races('house');
const sample=(race,dem,rep,fetchedAt='2026-11-03T23:18:00Z')=>({
 id:race.id,state:race.state,chamber:'house',fetchedAt,
 url:'https://polymarket.com/event/example-house-election',
 candidates:[
  {party:'D',name:'Democrat',label:'Democrat',scope:'individual',probability:dem,active:true,closed:false},
  {party:'R',name:'Republican',label:'Republican',scope:'individual',probability:rep,active:true,closed:false}
 ]
});
test('every House district appears exactly once',()=>{
 assert.equal(manifest.length,HOUSE_TOTAL);
 const dist=houseDistribution(null,now);
 assert.equal(dist.total,435);
 assert.equal(dist.bubbles.length,435);
 assert.equal(dist.counts.unavailable,435);
 assert.equal(new Set(dist.bubbles.map(r=>r.id)).size,435);
 assert.equal(Object.values(dist.counts).reduce((a,b)=>a+b,0),435);
});
test('market bands follow the quoted Yes price and are not vote-share forecasts',()=>{
 assert.equal(HOUSE_BANDS.length,7);
 for(const [p,expected] of [[.95,'D-strong'],[.90,'D-strong'],[.899,'D-likely'],[.75,'D-likely'],[.749,'D-lean'],[.60,'D-lean'],[.599,'close'],[.40,'close']]){
  assert.equal(houseBand({party:'D',probability:p}),expected);
 }
 assert.equal(houseBand({party:'R',probability:.90}),'R-strong');
 assert.equal(houseBand({party:'R',probability:.70}),'R-lean');
 assert.equal(houseBand({party:'O',probability:.97}),'unavailable');
 assert.equal(houseBand({party:'U',probability:null}),'unavailable');
});
test('fresh records select a band with source-backed candidate labels',()=>{
 const item=manifest[0];
 const snap={updatedAt:'2026-11-03T23:20:00Z',races:[sample(item,.90,.10)]};
 const dist=houseDistribution(snap,now);
 const current=dist.bubbles.find(x=>x.id===item.id);
 assert.equal(current.band,'D-strong');
 assert.equal(current.party,'D');
 assert.equal(current.leaderName,'Democrat');
 assert.equal(current.probability,.90);
 assert.equal(current.pair.length,2);
 assert.equal(dist.counts.unavailable,434);
 assert.equal(dist.byParty.D,1);
 assert.equal(dist.archived,false);
});
test('stale contract quotes are unassigned during a fresh snapshot',()=>{
 const snap={updatedAt:'2026-11-03T23:20:00Z',races:[sample(manifest[0],.96,.04,'2026-11-03T18:00:00Z')]};
 const dist=houseDistribution(snap,now);
 assert.equal(dist.counts.unavailable,435);
 assert.equal(dist.bubbles[0].party,'U');
});
test('archived distribution is clearly labeled, retaining only eligible quotes as of captured time',()=>{
 const older=Date.parse('2026-11-03T20:00:00Z');
 const snap={updatedAt:new Date(older).toISOString(),races:[
  sample(manifest[0],.91,.08,'2026-11-03T19:50:00Z'),
  sample(manifest[1],.80,.18,'2026-11-03T15:00:00Z')
 ]};
 const dist=houseDistribution(snap,now);
 assert.equal(dist.archived,true);
 assert.equal(dist.asOf,new Date(older).toISOString());
 assert.equal(dist.counts['D-strong'],1);
 assert.equal(dist.counts.unavailable,434);
});
test('deterministic state-labeled bubble coordinates stay inside their dynamic layout',()=>{
 const empty=houseDistribution(null,now);
 const geometry=layoutRaceBubbles(empty);
 const a=layoutHouseBubbles(empty),b=layoutHouseBubbles(empty);
 assert.equal(a.length,435);
 assert.deepEqual(a,b);
 assert.equal(geometry.nodes.length,435);
 assert.equal(new Set(a.map(p=>p.id)).size,435);
 for(const p of a){
  assert.match(p.state,/^[A-Z]{2}$/);
  assert.ok(p.r>=12,p.id+' has unreadable radius');
  assert.ok(p.x-p.r>=0&&p.x+p.r<=geometry.width,p.id+' x out of bounds');
  assert.ok(p.y-p.r>=0&&p.y+p.r<=geometry.height,p.id+' y out of bounds');
 }
 const total={...empty,bubbles:manifest.map(item=>({id:item.id,state:item.state,band:'D-strong',party:'D',probability:.99,reason:null,pair:[],url:null}))};
 const extreme=layoutRaceBubbles(total);
 assert.equal(extreme.nodes.length,435);
 assert.ok(extreme.height>geometry.height,'a concentrated band should expand vertically');
 for(const p of extreme.nodes){
  assert.ok(p.r>=12,p.id+' bubble shrank below label size');
  assert.ok(p.x-p.r>=0&&p.x+p.r<=extreme.width,p.id+' x outside chart');
  assert.ok(p.y-p.r>=0&&p.y+p.r<=extreme.height,p.id+' y outside chart');
 }
});
