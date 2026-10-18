import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,parseEarlyVoteCSV,validateEarlyVote,earlySummary,earlyStatus,safeEarlyLink,jurisdictions} from '../dist/early-vote-core.mjs';
const at='2026-10-18T20:00:00Z';
const csv=(overrides={})=>['state,state_abbv,last_update,data_source,notes,voted_all,inperson_all,accept_all,request_all',...jurisdictions.slice(0,40).map((s,i)=>[s.name,s.code,overrides.date??'10/18/2026','https://example.gov','"A note, with a comma"',i===0?(overrides.total??'NA'):'12','0','12','20'].join(','))].join('\r\n');
test('early vote CSV preserves quoted text, missing counts and genuine zero',()=>{
 const d=parseEarlyVoteCSV(csv(),at);assert.equal(d.rows.length,40);assert.equal(d.rows[0].total,null);assert.equal(d.rows[0].inPerson,0);assert.equal(d.rows[0].notes,'A note, with a comma');assert.equal(d.rows[0].asOf,'2026-10-18');
 assert.deepEqual(parseCSV('a,b\n"two\nlines","a ""quote"""'),[{a:'two\nlines',b:'a "quote"'}]);
});
test('early vote parser rejects truncated, duplicated, wrong-cycle and malformed counts',()=>{
 assert.throws(()=>parseEarlyVoteCSV(csv().split('\r\n').slice(0,4).join('\n'),at));
 for(const total of ['-1','oops','1.5','9007199254740992'])assert.throws(()=>parseEarlyVoteCSV(csv({total}),at));
 for(const date of ['10/18/2024','2/30/2026','bad'])assert.throws(()=>parseEarlyVoteCSV(csv({date}),at));
 const d=parseEarlyVoteCSV(csv(),at);d.rows[1]=d.rows[0];assert.throws(()=>validateEarlyVote(d));
 assert.throws(()=>parseCSV('a,b\n"unclosed,quote'));
});
test('early totals aggregate only reported fields, never requests into cast ballots',()=>{
 const summary=earlySummary([{total:10,inPerson:3,mail:7,requested:100},{total:null,inPerson:null,mail:null,requested:null}]);
 assert.deepEqual(summary.total,{value:10,coverage:1});assert.deepEqual(summary.requested,{value:100,coverage:1});assert.equal(earlySummary([]).total.value,null);
});
test('report age is independent of retrieval age and absent jurisdictions stay absent',()=>{
 const d=parseEarlyVoteCSV(csv({date:'8/12/2026',total:'0'}),at);
 assert.equal(earlyStatus(d.rows[0],Date.parse(at)),'Older report');assert.equal(earlyStatus(null),'Not in source');
 assert.equal(earlyStatus({...d.rows[0],asOf:'2026-10-18'},Date.parse(at)),'Zero in source');
});
test('source identity, future retrievals, and unsafe links are rejected',()=>{
 const d=parseEarlyVoteCSV(csv(),at);assert.throws(()=>validateEarlyVote({...d,source:'https://other.example'}));assert.throws(()=>validateEarlyVote({...d,fetchedAt:'2099-01-01'}));
 assert.equal(safeEarlyLink('javascript:alert(1)'),null);assert.equal(safeEarlyLink('Secretary of State'),null);assert.equal(safeEarlyLink('https://example.gov/votes'),'https://example.gov/votes');
});
