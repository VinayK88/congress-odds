import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const css=await readFile(new URL('../dist/race-history-polish.css',import.meta.url),'utf8');
const historyView=await readFile(new URL('../dist/race-history-view.mjs',import.meta.url),'utf8');
const scenario=await readFile(new URL('../dist/scenario.mjs',import.meta.url),'utf8');
const index=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
test('first-observation view displays observed prices but never a synthetic line',()=>{
 assert.match(historyView,/movement\.contracts/);
 assert.match(historyView,/if\(visible\.length===1\)\{/);
 assert.match(historyView,/Baseline recorded/);
 assert.match(historyView,/return;\s*}\s*\/\/ Contract IDs/);
 assert.match(historyView,/movementText\(line\.deltaPP\)/);
});
test('timeline retains user-selected timestamp across automatic map rerenders',()=>{
 assert.match(historyView,/const inspectedAt=new Map\(\)/);
 assert.match(historyView,/inspectedAt\.set\(raceId,row\[0\]\)/);
 assert.match(historyView,/const saved=inspectedAt\.get\(raceId\)/);
 assert.match(historyView,/select\(Number\(slider\.value\),true\)/);
});
test('new timeline UI uses readable and responsive cards',()=>{
 assert.match(css,/\.race-history-movement-grid/);
 assert.match(css,/\.race-history-movement-delta\.is-up/);
 assert.match(css,/\.race-history-movement-delta\.is-down/);
 assert.match(css,/@media\(max-width:750px\)/);
 assert.match(css,/@media\(prefers-contrast:more\)/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
test('fresh modules and styles are wired without breaking existing map briefing',()=>{
 assert.ok(index.includes('race-history-polish.css?v=20261013-insights'));
 assert.ok(index.includes('scenario.mjs?v=20261013-insights'));
 assert.match(scenario,/race-history-view\.mjs\?v=20261013-insights/);
 assert.ok(scenario.includes('renderStateBriefing(briefing,view)'));
 assert.ok(scenario.includes('renderRaceHistory(history,view.raceId)'));
});
