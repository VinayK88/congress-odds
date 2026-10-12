import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const scenario=await readFile(new URL('../dist/scenario.mjs',import.meta.url),'utf8');
const view=await readFile(new URL('../dist/battleground-view.mjs',import.meta.url),'utf8');
const css=await readFile(new URL('../dist/battleground.css',import.meta.url),'utf8');
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
test('radar remains separate from the scenario and its source-derived snapshot is not modified',()=>{
 assert.ok(scenario.includes('renderBattlegroundRadar(radar,battlegroundRadar(snapshot,chamber,Date.now(),radarThreshold)'));
 assert.ok(scenario.includes("radar.hidden=!market"));
 assert.ok(scenario.includes('snapshot=getCandidateSnapshot()'));
 assert.ok(scenario.includes("b.dataset.radarRace"));
 assert.ok(scenario.includes("b.dataset.radarThreshold"));
 assert.ok(scenario.includes("b.dataset.radarToggle"));
 assert.ok(scenario.includes("$('#state-map').scrollIntoView({block:'start'})"));
});
test('markup respects party identity, custom ranges, and independent yes-market prices',()=>{
 assert.ok(view.includes("Not polls, vote margins or election results."));
 assert.ok(view.includes("Both contracts retain their original prices."));
 assert.ok(view.includes("b.dataset.radarThreshold"));
 assert.ok(view.includes("b.dataset.radarRace"));
 assert.ok(view.includes("b.setAttribute('aria-label'"));
 assert.ok(!view.includes('innerHTML'));
});
test('no misleading close race ranking when verification is unavailable',()=>{
 assert.ok(view.includes('Waiting for the verified race-market snapshot.'));
 assert.ok(view.includes('Stale or incomplete prices are excluded.'));
 assert.ok(view.includes('No comparable races fall within'));
});
test('responsive styles and cache versions are available on the live page',()=>{
 assert.ok(html.includes('battleground.css?v=20261013-radar'));
 assert.match(html,/src="scenario\.mjs\?v=[^"]+"/);
 assert.ok(html.indexOf('battleground.css')>html.indexOf('flip-watch.css'));
 assert.ok(css.includes('@media(max-width:680px)'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('prefers-contrast:more'));
 assert.ok(css.includes('.radar-party.party-D .radar-price'));
 assert.ok(css.includes('.radar-party.party-R .radar-price'));
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
