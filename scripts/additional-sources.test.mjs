import test from 'node:test';
import assert from 'node:assert/strict';
import {parseManifold,manifoldMarkets,parsePredictIt,consensus,markdown} from '../dist/data-core.mjs';
import {validateLatest,mergeLatest} from '../dist/reliability.mjs';
const at='2026-10-18T06:00:00Z',now=Date.parse(at);
const markets=chamber=>Object.values(manifoldMarkets[chamber]).map((m,i)=>({...m,outcomeType:'BINARY',token:'MANA',probability:i?.21:.81,isResolved:false,closeTime:now+86400000}));
test('Manifold maps direct party contracts by verified ID, without complements or normalization',()=>{
 for(const chamber of ['house','senate']){
  const c=parseManifold(markets(chamber).reverse(),chamber,at);
  assert.equal(c.parties.democratic.probability,.81);assert.equal(c.parties.republican.probability,.21);
  assert.doesNotThrow(()=>validateLatest({schemaVersion:2,electionYear:2026,sources:{manifold:{[chamber]:c}}},now));
 }
});
test('Manifold rejects mismatched contracts, absent quotes, missing party, wrong currency and malformed close times',()=>{
 for(const change of [m=>m.id='different',m=>m.slug='different',m=>m.probability=null,m=>m.probability='0.5',m=>m.probability=1.1,m=>m.token='CASH',m=>delete m.isResolved,m=>m.closeTime=null,m=>m.outcomeType='MULTIPLE_CHOICE']){
  const pair=markets('house');change(pair[0]);assert.throws(()=>parseManifold(pair,'house',at));
 }
 assert.throws(()=>parseManifold([markets('house')[0]],'house',at));
});
test('closed and resolved Manifold contracts stay labeled closed',()=>{
 const pair=markets('house');pair[0].closeTime=now;pair[1].isResolved=true;
 const c=parseManifold(pair,'house',at);assert.equal(c.parties.democratic.closed,true);assert.equal(c.parties.republican.closed,true);
});
test('play money is excluded from cash-market average and labeled in README',()=>{
 const m=parseManifold(markets('house'),'house',at);
 const p={...m,source:'PredictIt',parties:{democratic:{probability:.6,closed:false},republican:{probability:.43,closed:false}}};
 const data={sources:{manifold:{house:m},predictit:{house:p}}};
 assert.equal(consensus(data,'house',now).parties.democratic.probability,.6);
 assert.equal(consensus(data,'house',now).parties.republican.probability,.43);
 assert.equal(consensus({sources:{manifold:{house:m}}},'house',now),null);
 assert.match(markdown(data,undefined,now),/play money \(comparison only\)/);
});
const piHouse=()=>({id:8157,contracts:[{id:12,shortName:'Republican',bestSellYesCost:.2,bestBuyYesCost:.22,status:'Open'},{id:11,shortName:'Democratic',bestSellYesCost:.8,bestBuyYesCost:.82,status:'Open'}]});
test('PredictIt House requires exact party labels and rejects ambiguous contracts',()=>{
 const c=parsePredictIt(piHouse(),at,'house');assert.equal(c.chamber,'house');assert.equal(c.parties.democratic.marketId,11);
 assert.ok(Math.abs(c.parties.democratic.probability-.81)<1e-12);
 assert.doesNotThrow(()=>validateLatest({schemaVersion:2,electionYear:2026,sources:{predictit:{house:c}}},now));
 const bad=piHouse();bad.contracts[1].shortName='Democratic and Republican';assert.throws(()=>parsePredictIt(bad,at,'house'));
 const dup=piHouse();dup.contracts.push(dup.contracts[0]);assert.throws(()=>parsePredictIt(dup,at,'house'));
 assert.throws(()=>parsePredictIt(piHouse(),at,'senate'));
});
test('new source failures survive validation and merging without fabricating snapshots',()=>{
 const data={schemaVersion:2,electionYear:2026,sources:{manifold:{house:parseManifold(markets('house'),'house',at)}},errors:{'predictit/house':'HTTP 403'}};
 const valid=validateLatest(data,now);assert.equal(valid.errors['predictit/house'],'HTTP 403');
 const merged=mergeLatest({sources:{},errors:{}},valid);assert.equal(merged.errors['predictit/house'],'HTTP 403');assert.equal(merged.sources.predictit,undefined);
 const corrupt=structuredClone(data);corrupt.sources.manifold.house.parties.democratic.url='https://evil.example';assert.throws(()=>validateLatest(corrupt,now));
});
