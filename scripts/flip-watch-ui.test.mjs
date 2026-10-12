import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyScenario} from '../dist/scenario-core.mjs';
import {mapMarkup} from '../dist/state-map.mjs';
const base=new URL('../dist/',import.meta.url);
const scenario=await readFile(new URL('scenario.mjs',base),'utf8');
const view=await readFile(new URL('flip-watch-view.mjs',base),'utf8');
const css=await readFile(new URL('flip-watch.css',base),'utf8');
const html=await readFile(new URL('index.html',base),'utf8');
test('map flip outlines are optional and never alter original party/state geometry',()=>{
 const summary=code=>({counts:{D:0,R:1,O:0,U:0},total:1,text:code+' market leader',fill:'#b73643'});
 const old=mapMarkup('senate',emptyScenario(),'GA',{market:true,summary});
 const highlighted=mapMarkup('senate',emptyScenario(),'GA',{market:true,summary,flipStates:{GA:{count:1}}});
 assert.match(old,/class="map-state " data-state="GA"/);
 assert.doesNotMatch(old,/class="map-state  flipped-market"/);
 assert.match(highlighted,/class="map-state  flipped-market" data-state="GA"/);
 assert.match(highlighted,/market leader switch recorded within the selected period/);
 assert.match(highlighted,/fill="#b73643"/);
});
test('flip watch is separate from simulated outcome mode with accessible range controls',()=>{
 assert.ok(scenario.includes('marketLeaderFlips(historyArchive,chamber,Date.now(),flipWindow)'));
 assert.ok(scenario.includes("flipWatch.hidden=!market"));
 assert.ok(scenario.includes("mapMarkup(chamber,scenario,selected,{summary,market,flipStates:market&&highlightFlips?flipStats.states:null})"));
 assert.ok(scenario.includes("b.dataset.flipWindow"));
 assert.ok(scenario.includes("b.dataset.flipOverlay"));
 assert.ok(scenario.includes("b.dataset.flipRace"));
 assert.ok(view.includes("aria-label"));
 assert.ok(view.includes("toggle.dataset.flipOverlay"));
});
test('visual status explains non-electoral meaning and incomplete evidence',()=>{
 assert.ok(view.includes("NOT actual election seat flips"));
 assert.ok(view.includes("does NOT mean every district flipped"));
 assert.ok(view.includes("Insufficient comparable historical quotes"));
 assert.ok(view.includes("No verified Democratic"));
 assert.ok(css.includes('.map-state.flipped-market path'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('@media(max-width:730px)'));
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
test('new CSS and versioned map module are linked',()=>{
 assert.match(html,/href="flip-watch\.css\?v=[^"]+"/);
 assert.match(html,/src="scenario\.mjs\?v=[^"]+"/);
 assert.match(scenario,/from ['"]\.\/state-map\.mjs(?:\?v=[^'"]+)?['"]/);
});
