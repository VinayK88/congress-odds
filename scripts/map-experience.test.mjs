import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const scenario=await readFile(new URL('../dist/scenario.mjs',import.meta.url),'utf8');
const css=await readFile(new URL('../dist/map-experience.css',import.meta.url),'utf8');
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');

test('map focus control supports pressed state and restores keyboard focus',()=>{
 assert.match(scenario,/id="map-focus-toggle"/);
 assert.match(scenario,/aria-controls="state-map"/);
 assert.match(scenario,/mapFocus=!mapFocus/);
 assert.match(scenario,/\.setAttribute\('aria-pressed',String\(mapFocus\)\)/);
 assert.match(scenario,/\$\('#map-focus-toggle'\)\.focus\(\{preventScroll:true\}\)/);
});
test('state preview is safe, source-backed and keyboard accessible',()=>{
 assert.match(scenario,/function showMapPeek\(code\)/);
 assert.match(scenario,/peek\.querySelector\('span'\)\.textContent=detail\.text/);
 assert.match(scenario,/\['pointerover','focusin'\]/);
 assert.match(scenario,/addEventListener\('focusout'/);
 assert.match(scenario,/peek\.setAttribute\('aria-hidden','true'\)/);
});
test('presentation styling preserves reduced-motion and mobile layouts',()=>{
 assert.match(css,/#race-simulator\.map-focus \.scenario-layout/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(css, /map-peek\[hidden\]/);
 assert.match(css, /prefers-contrast:more/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
test('latest CSS and versioned scenario module load in site',()=>{
 assert.match(html,/href="map-experience\.css\?v=[^"]+"/);
 assert.match(html,/src="scenario\.mjs\?v=[^\"]+"/);
 assert.ok(html.indexOf('map-experience.css')>html.indexOf('state-briefing.css'));
 assert.ok(scenario.includes("briefingForState(chamber,selected,district,snapshot)"));
 assert.ok(scenario.includes("renderStateBriefing(briefing,view)"));
 assert.ok(scenario.includes("marketCoverage(chamber,snapshot)"));
});
