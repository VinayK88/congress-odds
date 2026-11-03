import test from 'node:test';
import assert from 'node:assert/strict';
import {HOUSE_BANDS,SENATE_RACES,senateDistribution,layoutSenateBubbles,layoutRaceBubbles} from '../dist/house-swarm-core.mjs';
import {races} from '../dist/scenario-core.mjs';
import {HOLDOVERS} from '../dist/race-data.mjs';

const now=Date.parse('2026-11-03T23:30:00Z');
const races35=races('senate');
const sample=(race,dem,rep,when='2026-11-03T23:18:00Z')=>({
 id:race.id,state:race.state,chamber:'senate',fetchedAt:when,
 url:'https://polymarket.com/event/example-senate-election',
 candidates:[
  {party:'D',name:'Democratic nominee',label:'Democratic nominee',scope:'party',probability:dem,active:true,closed:false},
  {party:'R',name:'Republican nominee',label:'Republican nominee',scope:'party',probability:rep,active:true,closed:false}
 ]
});
test('Senate atlas counts 35 contested elections and excludes 65 holdovers',()=>{
 const d=senateDistribution(null,now);
 assert.equal(SENATE_RACES,35);
 assert.equal(races35.length,35);
 assert.equal(d.bubbles.length,35);
 assert.equal(d.counts.unavailable,35);
 assert.equal(Object.values(d.counts).reduce((a,b)=>a+b,0),35);
 assert.equal(HOLDOVERS.D,34);
 assert.equal(HOLDOVERS.R,31);
 assert.equal(HOLDOVERS.D+HOLDOVERS.R,65);
 assert.equal(new Set(d.bubbles.map(x=>x.id)).size,35);
 assert.equal(new Set(d.bubbles.map(x=>x.state)).size,35);
});
test('Senate states appear inside legible bubbles and retain all race IDs',()=>{
 const d=senateDistribution(null,now),a=layoutSenateBubbles(d),g=layoutRaceBubbles(d);
 assert.deepEqual(a,g.nodes);
 assert.equal(a.length,35);
 for(const p of a){
  assert.match(p.state,/^[A-Z]{2}$/);
  assert.equal(p.id,p.state+'-S');
  assert.ok(p.r>=16,'state code must fit inside a Senate bubble');
  assert.ok(p.x-p.r>=0&&p.x+p.r<=g.width);
  assert.ok(p.y-p.r>=0&&p.y+p.r<=g.height);
 }
});
test('Senate quote tiers are driven by current prices, not certified results',()=>{
 const source={updatedAt:'2026-11-03T23:20:00Z',
  races:[sample(races35[0],.97,.03),sample(races35[1],.48,.50),sample(races35[2],.06,.91)]};
 const d=senateDistribution(source,now);
 assert.equal(d.counts['D-strong'],1);
 assert.equal(d.counts.close,1);
 assert.equal(d.counts['R-strong'],1);
 assert.equal(d.counts.unavailable,32);
 assert.equal(Object.values(d.counts).reduce((a,b)=>a+b,0),35);
 assert.equal(HOUSE_BANDS.length,7);
});
test('stale quotes are excluded and archived prices remain labeled historical',()=>{
 const fresh={updatedAt:'2026-11-03T23:20:00Z',races:[sample(races35[0],.99,.01,'2026-11-03T14:00:00Z')]};
 assert.equal(senateDistribution(fresh,now).counts.unavailable,35);
 const historical={updatedAt:'2026-11-03T20:00:00Z',races:[sample(races35[0],.97,.03,'2026-11-03T19:55:00Z')]};
 const archive=senateDistribution(historical,now);
 assert.equal(archive.archived,true);
 assert.equal(archive.counts['D-strong'],1);
 assert.equal(archive.counts.unavailable,34);
});


test('responsive layouts fit without horizontal scrolling at narrow screen widths',()=>{
 const data=senateDistribution(null,now);
 for(const size of [240,280,320,375,430,600,820,1090]){
  const g=layoutRaceBubbles(data,size);
  assert.equal(g.compact,true,'stacked layout should be used at '+size);
  assert.equal(g.width,size,'chart width must be viewport width');
  assert.equal(g.nodes.length,35);
  assert.equal(g.sections.length,8,'seven market bands plus unassigned strip');
  for(const p of g.nodes){
   assert.ok(p.x-p.r>=0&&p.x+p.r<=g.width,`${p.id} clipped horizontally at ${size}`);
   assert.ok(p.y-p.r>=0&&p.y+p.r<=g.height,`${p.id} clipped vertically at ${size}`);
   assert.ok(p.r>=12,'state code should remain legible');
  }
  for(let i=0;i<g.nodes.length;i++){
   for(let j=i+1;j<g.nodes.length;j++){
    const a=g.nodes[i],b=g.nodes[j];
    const delta=Math.hypot(a.x-b.x,a.y-b.y);
    assert.ok(delta>=a.r+b.r-1.2,`${a.id} and ${b.id} overlap at ${size}`);
   }
  }
 }
});
