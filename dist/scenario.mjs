import {marketStateSummary,raceLeader,marketTotals} from './market-map.mjs?v=20261012-totals';
import {renderRaceCandidates,getCandidateSnapshot} from './candidates.mjs?v=20261012-directory';
import {createScenarioHistory} from './scenario-history.mjs';
import {mapMarkup,stateSummary} from './state-map.mjs?v=20261012-market-map';
import {STATES,VERIFIED_ON} from './race-data.mjs';
import {PARTIES,races,emptyScenario,validateScenario,seatPartyPreset,tally} from './scenario-core.mjs';
const root=document.querySelector('#race-simulator');
const $=s=>root.querySelector(s);
const KEY='congress-odds-scenario-v1';
let scenario=emptyScenario(),chamber='senate',selected='GA',district='GA-S',mode='market';
let exportURL;
let storageMessage='Your scenarios save on this device.';
try { const saved=localStorage.getItem(KEY);if(saved){if(saved.length>100000)throw new Error('Oversized scenario');scenario=validateScenario(JSON.parse(saved));} }
catch { storageMessage='Saved scenario unavailable. Starting with unassigned races.'; }
const scenarioHistory=createScenarioHistory(scenario);
function save() { try{localStorage.setItem(KEY,JSON.stringify(scenario));storageMessage='Scenario saved on this device.';}catch{storageMessage='Device storage unavailable. Download your scenario to keep it.';} }
root.innerHTML=`<div class="section-heading"><div><p class="eyebrow">EXPLORE THE ELECTORAL LANDSCAPE</p><h2>Every race. A changing picture.</h2></div><span class="model-badge">2026 RACE EXPLORER</span></div>
<p class="section-intro">Explore the latest available market odds across 35 Senate races and 435 House districts. Select a state to see candidates and their chances, or switch to Your scenario to build your own path to a majority.</p>
<div class="map-broadcast-banner"><strong>★ 2026 CONGRESSIONAL ATLAS</strong><span>435 House districts · 35 Senate contests</span><span class="banner-stars" aria-hidden="true">★ ★ ★</span></div>
<div class="map-mode-switch chamber-switch" role="group" aria-label="Map view"><button type="button" data-map-mode="market" aria-pressed="true">Market odds</button><button type="button" data-map-mode="scenario" aria-pressed="false">Your scenario</button></div><div id="market-map-status" class="market-map-status" role="status"></div><div class="scenario-toolbar"><div class="chamber-switch" role="group" aria-label="Map chamber"><button type="button" data-chamber="senate" aria-pressed="true">Senate · 100 seats</button><button type="button" data-chamber="house" aria-pressed="false">House · 435 seats</button></div><label id="vp-field">Senate tie-break <select id="scenario-vp" aria-label="Senate tie-break"><option value="R">Republican VP</option><option value="D">Democratic VP</option><option value="none">No tie-break assumed</option></select></label></div>
<div id="market-seat-totals" class="scenario-board market-seat-totals" aria-live="polite" aria-atomic="true"></div>
<div class="scenario-board"><div class="scenario-score" id="scenario-score" aria-live="polite" aria-atomic="true"></div><div id="majority-paths" class="majority-paths"></div><div id="seat-dots" class="seat-dots" aria-hidden="true"></div><p id="scenario-base" class="fine"></p></div>
<div class="scenario-layout"><div class="scenario-map-panel"><div class="scenario-map-heading"><h3>Pick a state. Shape the chamber.</h3><div class="state-picker"><label class="state-picker-label" for="scenario-state">SELECT STATE <span aria-hidden="true">★</span></label><div class="state-picker-control"><span class="state-picker-emblem" aria-hidden="true">★</span><select id="scenario-state" aria-label="Select state to explore on the map">${STATES.map(s=>`<option value="${s.code}">${s.name}</option>`).join('')}</select><span id="state-picker-code" class="state-picker-code" aria-hidden="true">GA</span><svg class="state-picker-chevron" aria-hidden="true" focusable="false" viewBox="0 0 20 20" width="20" height="20"><path d="m5 7 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div></div><p class="fine">Click a state on the map · Alaska and Hawaii shown as insets</p><div id="state-map" class="state-map"></div><p id="map-hover" class="map-hover" aria-live="polite"></p><div class="scenario-legend" id="scenario-legend"><span><i class="scenario-key party-D"></i>Democratic</span><span><i class="scenario-key party-R"></i>Republican</span><span><i class="scenario-key party-O"></i>Other</span><span><i class="scenario-key party-U"></i>Unassigned</span></div><div id="market-map-legend" class="market-map-legend"></div><p class="fine" id="map-caption"></p></div>
<aside class="race-editor"><p class="eyebrow">YOUR RACE CALL</p><h3 id="editor-state"></h3><p id="editor-context" class="fine"></p><div id="district-list" class="district-list" role="group" aria-label="Districts in selected state"></div><h4 id="editor-race"></h4><div id="party-choices" class="party-choices" role="group" aria-label="Assign selected race">${Object.entries(PARTIES).map(([key,name])=>`<button type="button" data-party="${key}" aria-pressed="false"><i class="scenario-key party-${key}"></i>${name}</button>`).join('')}</div><fieldset id="fill-state"><legend>Assign every district in this state</legend><button type="button" data-fill="D">All Democratic</button><button type="button" data-fill="R">All Republican</button><button type="button" data-fill="U">Clear state</button></fieldset><div id="race-candidate-profiles"></div></aside></div>
<div class="scenario-actions"><button type="button" id="scenario-undo" disabled>Undo</button><button type="button" id="scenario-redo" disabled>Redo</button><button type="button" id="scenario-preset">Use current Senate seat parties</button><button type="button" id="scenario-reset">Clear Senate choices</button><a id="scenario-export" download="congress-odds-scenario.json">Download scenario</a><label class="scenario-import">Import scenario<input type="file" id="scenario-import" accept="application/json,.json"></label></div><p class="fine" id="scenario-save" role="status"></p>
<details class="scenario-json"><summary>Copy scenario JSON if downloads are unavailable</summary><label for="scenario-json">Portable scenario for both chambers</label><textarea id="scenario-json" readonly spellcheck="false" rows="5"></textarea><button type="button" id="scenario-copy">Copy scenario JSON</button></details>
<details class="model-details"><summary>Seat counts, sources &amp; scenario assumptions</summary><p>The Senate starts with 65 seats not on the 2026 ballot: 34 Democratic-aligned (32 Democrats and two independents) and 31 Republicans. Assign the 33 Class II seats plus Florida and Ohio special elections. The optional current-party preset assigns the 35 contested seats to their seat-holding parties as of ${VERIFIED_ON}; it is not a prediction or candidate list.</p><p>House district numbers cover all 435 voting seats using 2020 Census apportionment. Every House seat starts unassigned. The geographic map shows state boundaries; choose a state to access its House districts. District boundaries are not mapped. Separate market profiles beside the editor show source-listed candidates where available; these do not set scenario choices. Non-voting delegates are excluded.</p><p>Control here means a numerical majority of the full chamber: 218 House seats or 51 Senate seats. In a fully assigned 50–50 Democratic/Republican Senate, the chosen VP breaks the tie (Republican by default). Other or unaffiliated winners are not assigned to a coalition. Assign an independent to a bloc only if that is your scenario assumption. Vacancies, defections, Speaker votes and coalition negotiations are not modeled.</p><p>Sources verified ${VERIFIED_ON}: <a href="https://www.senate.gov/senators/Class_II.htm">Senate Class II</a> · <a href="https://www.senate.gov/general/contact_information/senators_cfm.xml">Senate roster</a> · <a href="https://www.270towin.com/2026-senate-election/">2026 special-election coverage</a> · <a href="https://www.census.gov/library/visualizations/2021/dec/2020-apportionment-map.html">Census apportionment</a> · <a href="https://www.senate.gov/legislative/TieVotes.htm">VP tie-break authority</a>. This static race manifest is not updated by the hourly market refresh. Map geometry: <a href="https://github.com/topojson/us-atlas">us-atlas 3.0.1, Census 2017 state boundaries</a> (<a href="us-atlas-LICENSE.txt">ISC license</a>). Alaska and Hawaii are repositioned and Alaska is scaled down.</p></details>`;
function summary(code){return mode==='market'?marketStateSummary(chamber,getCandidateSnapshot(),code):stateSummary(chamber,scenario,code);}
function render() {
  const market=mode==='market',snapshot=getCandidateSnapshot();
  root.dataset.mapMode=mode;
  for(const selector of ['.scenario-board:not(.market-seat-totals)','.scenario-actions','#scenario-save','.scenario-json','#scenario-legend'])$(selector).hidden=market;
  $('#market-seat-totals').hidden=!market;
  const mt=marketTotals(chamber,snapshot);
  $('#market-seat-totals').innerHTML=`<div class="scenario-totals"><div class="blue"><span>${chamber==='senate'?'DEMOCRATIC-ALIGNED':'DEMOCRATIC'}</span><strong>${mt.counts.D}</strong><small>${chamber==='senate'?mt.holdovers.D+' holdovers + ':''}${mt.contested.D} market leads</small></div><div class="scenario-center"><span>${chamber.toUpperCase()} · MARKET LEADER TALLY</span><b>${mt.majority} seats for a majority</b></div><div class="red"><span>REPUBLICAN</span><strong>${mt.counts.R}</strong><small>${chamber==='senate'?mt.holdovers.R+' holdovers + ':''}${mt.contested.R} market leads</small></div></div><div class="market-seat-bar" aria-hidden="true">${Object.entries(mt.counts).map(([p,n])=>`<i class="party-${p}" style="width:${n/mt.total*100}%"></i>`).join('')}<b style="left:${mt.majority/mt.total*100}%"></b></div><p class="fine">${mt.counts.O} other · ${mt.counts.U} unclear / unavailable · ${mt.total} total seats</p><p class="fine market-tally-note">${chamber==='senate'?'Includes 65 holdover seats: 34 Democratic-aligned (including two independents) and 31 Republican. ':''}Each eligible race counts once for its market leader. This is not a probability-weighted seat forecast or an election result. Unclear races stay separate.</p>`;
  $('#market-map-status').hidden=!market;$('#market-map-legend').hidden=!market;
  root.querySelectorAll('[data-map-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapMode===mode)));
  $('.scenario-map-heading h3').textContent=market?'Where the markets stand.':'Pick a state. Shape the chamber.';
  $('.race-editor>.eyebrow').textContent=market?'RACE MARKET DETAILS':'YOUR RACE CALL';
  const all=races(chamber),priced=all.filter(r=>raceLeader(snapshot?.races.find(item=>item.id===r.id)).party!=='U').length;
  $('#market-map-status').textContent=snapshot?`${priced} of ${all.length} contested races have a clear, fresh market leader. Polymarket snapshots · retrieved ${new Date(snapshot.updatedAt).toLocaleString()}. Updated hourly; this page checks every 5 minutes. Each race expires after 2 hours.`:'Loading race market snapshots…';
  $('#market-map-legend').innerHTML=chamber==='senate'?`<strong>Leading contract’s market-implied chance</strong><div class="probability-key"><span>Democratic</span><i style="background:#bed3f3"></i><i style="background:#82a9df"></i><i style="background:#477bc3"></i><i style="background:#235aaa"></i><span>Republican</span><i style="background:#efc1c7"></i><i style="background:#df8e99"></i><i style="background:#c95868"></i><i style="background:#b73643"></i></div><p>Light → dark: under 60% · 60–79.9% · 80–94.9% · 95%+. Gold: other party. Gray: tied, stale, missing quotes or unknown party. Pale dashed: no contest.</p>`:`<strong>District market leaders within each state</strong><p><i class="scenario-key party-D"></i> Democratic · <i class="scenario-key party-R"></i> Republican · <i class="scenario-key party-O"></i> Other · <i class="scenario-key party-U"></i> Unclear / unavailable</p>`;
  const {counts,total,majority,control,tie}=tally(scenario,chamber);
  const status=control?`${PARTIES[control]} ${tie?'control via VP tie-break':'majority'}`:counts.U?'Control still open in your scenario':'No bloc has a majority under these assumptions';
  $('#scenario-score').innerHTML=`<div class="scenario-totals"><div class="blue"><span>DEMOCRATIC-ALIGNED</span><strong>${counts.D}</strong></div><div class="scenario-center"><span>${chamber.toUpperCase()} · YOUR SCENARIO</span><b>${majority} for an outright majority</b></div><div class="red"><span>REPUBLICAN-ALIGNED</span><strong>${counts.R}</strong></div></div><p class="scenario-result">${status}</p><p class="fine">${counts.O} other · ${counts.U} unassigned · ${total} total seats</p>`;
  $('#majority-paths').innerHTML=['D','R'].map(p=>`<div><div class="majority-label"><span>${p==='D'?'Democratic':'Republican'} path</span><strong>${Math.max(0,majority-counts[p])===0?'Majority reached':Math.max(0,majority-counts[p])+' seats to majority'}</strong></div><div class="majority-track"><span class="party-${p}" style="width:${counts[p]/total*100}%"></span><i style="left:${majority/total*100}%" aria-hidden="true"></i></div><small>${counts[p]} of ${total} seats · marker at ${majority}</small></div>`).join('');
  $('#seat-dots').classList.toggle('house-dots',chamber==='house');
  $('#seat-dots').innerHTML=Object.keys(PARTIES).flatMap(party=>Array.from({length:counts[party]},()=>`<i class="party-${party}"></i>`)).join('');
  $('#scenario-base').textContent=chamber==='senate'?'Includes 65 holdover seats: 34 Democratic-aligned + 31 Republican. Only the 35 contested seats are editable.':'All 435 voting districts are editable. No winners or probabilities are prefilled.';
  $('[data-chamber="senate"]').setAttribute('aria-pressed',String(chamber==='senate'));
  $('[data-chamber="house"]').setAttribute('aria-pressed',String(chamber==='house'));
  $('#vp-field').hidden=market||chamber!=='senate';$('#scenario-vp').value=scenario.vp;
  $('#scenario-state').value=selected;
  $('#state-picker-code').textContent=selected;
  $('#state-map').innerHTML=mapMarkup(chamber,scenario,selected,{summary,market});
  $('#map-hover').textContent=summary(selected).text;
  $('#map-caption').textContent=market?(chamber==='senate'?'Color shows the highest quoted eligible contract and its probability, not an election result. Party / nominee contracts can follow a replacement nominee.':'Color bands show the count of district market leaders, not a statewide win probability or projected seat total. Choose a district for its candidate odds. District boundaries are not drawn.'):chamber==='senate'?'State colors show your Senate choices. Pale, dashed states have no Senate contest in 2026.':'State color bands show the share of districts you assigned to each bloc. Click a state to choose individual House districts.';
  const state=STATES.find(s=>s.code===selected),rr=races(chamber,selected);
  if(!rr.some(r=>r.id===district))district=rr[0]?.id||null;
  const race=rr.find(r=>r.id===district);
  $('#editor-state').textContent=state.name;
  $('#editor-context').textContent=chamber==='house'?`${state.houseSeats} voting district${state.houseSeats===1?'':'s'}. ${market?'Select a district for candidate odds.':'Select a district, then choose its outcome.'}`:state.senateParty?`${state.special?'Special election':'Regular Class II election'} · current seat party: ${state.senateParty==='D'?'Democratic':'Republican'}.`:'No Senate seat on the 2026 ballot. Choose another state or switch to House.';
  $('#district-list').hidden=chamber!=='house';
  $('#district-list').innerHTML=chamber==='house'?rr.map(r=>{const leader=market?raceLeader(snapshot?.races.find(item=>item.id===r.id)):null,p=market?leader.party:(scenario[chamber][r.id]||'U');return `<button type="button" data-district="${r.id}" class="district-chip assigned-${p}" aria-pressed="${district===r.id}" aria-label="${r.id}: ${market?(p==='U'?leader.reason:PARTIES[p]+' market leader at '+(leader.probability*100).toFixed(1)+'%'):PARTIES[p]}">${r.id.split('-')[1]}<small>${p}</small></button>`;}).join(''):'';
  renderRaceCandidates({chamber,state:selected,raceId:race?.id||null});
  $('#editor-race').textContent=race?`${race.id} · ${race.label}`:'';
  $('#party-choices').hidden=market||!race;
  root.querySelectorAll('[data-party]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.party===(race?(scenario[chamber][race.id]||'U'):null))));
  $('#fill-state').hidden=market||chamber!=='house';$('#scenario-preset').hidden=chamber!=='senate';
  $('#scenario-reset').textContent=`Clear ${chamber==='senate'?'Senate':'House'} choices`;
  $('#scenario-save').textContent=storageMessage;
  $('#scenario-undo').disabled=!scenarioHistory.canUndo;$('#scenario-redo').disabled=!scenarioHistory.canRedo;
  if(exportURL)URL.revokeObjectURL(exportURL);
  const portable=JSON.stringify({...validateScenario(scenario),manifestVerified:VERIFIED_ON},null,2);
  $('#scenario-json').value=portable;
  exportURL=URL.createObjectURL(new Blob([portable],{type:'application/json'}));
  $('#scenario-export').href=exportURL;
}
function update() {scenario=scenarioHistory.commit(scenario);save();render();}
// Preserve keyboard focus when map and district controls are rebuilt.
root.addEventListener('click',event=>{
  const b=event.target.closest('button,[data-state]');if(!b)return;
  if(b.dataset.mapMode){mode=b.dataset.mapMode;render();}
  else if(b.dataset.chamber){chamber=b.dataset.chamber;render();}
  else if(b.dataset.state){selected=b.dataset.state;render();$(`[data-state="${selected}"]`).focus();}
  else if(b.dataset.district){district=b.dataset.district;render();$(`[data-district="${district}"]`).focus();}
  else if(mode==='scenario' && b.dataset.party && district){scenario[chamber][district]=b.dataset.party;update();}
  else if(mode==='scenario' && b.dataset.fill){races(chamber,selected).forEach(r=>scenario[chamber][r.id]=b.dataset.fill);update();}
});
root.addEventListener('keydown',event=>{
  const state=event.target.closest('.map-state');
  if(state && ['Enter',' '].includes(event.key)){event.preventDefault();selected=state.dataset.state;render();$(`[data-state="${selected}"]`).focus();}
});
for(const type of ['pointerover','focusin'])$('#state-map').addEventListener(type,event=>{
  const state=event.target.closest('[data-state]');if(state)$('#map-hover').textContent=summary(state.dataset.state).text;
});
$('#state-map').addEventListener('pointerleave',()=>{$('#map-hover').textContent=summary(selected).text;});
$('#scenario-undo').addEventListener('click',()=>{scenario=scenarioHistory.undo();save();render();});
$('#scenario-redo').addEventListener('click',()=>{scenario=scenarioHistory.redo();save();render();});
$('#scenario-copy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText($('#scenario-json').value);$('#scenario-save').textContent='Scenario JSON copied. Save it as a .json file to import later.';}
 catch{$('#scenario-json').focus();$('#scenario-json').select();$('#scenario-save').textContent='Scenario JSON selected. Use your browser’s Copy command to copy it.';}
});
window.addEventListener('storage',event=>{
 if(event.key===KEY&&event.newValue!==JSON.stringify(scenario)){$('#scenario-save').textContent='A different scenario was saved in another tab. Download or copy your current choices before reloading; your next edit will save this tab’s version.';}
});
$('#scenario-state').addEventListener('change',e=>{selected=e.target.value;render();});
$('#scenario-vp').addEventListener('change',e=>{scenario.vp=e.target.value;update();});
$('#scenario-preset').addEventListener('click',()=>{scenario.senate=seatPartyPreset();update();});
$('#scenario-reset').addEventListener('click',()=>{scenario[chamber]={};update();});
$('#scenario-import').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>100000)throw new Error();const next=validateScenario(JSON.parse(await file.text()));scenario=next;update();$('#scenario-save').textContent='Imported both chambers and the VP assumption. '+storageMessage;}
  catch{$('#scenario-save').textContent='Could not import this file. Use a valid Congress Odds scenario JSON. Your current choices are unchanged.';}
  e.target.value='';
});
render();

function refreshMap(){if(mode!=='market')return;const active=document.activeElement,state=active?.dataset?.state,districtId=active?.dataset?.district;render();if(state)$(`[data-state="${state}"]`)?.focus({preventScroll:true});else if(districtId)$(`[data-district="${districtId}"]`)?.focus({preventScroll:true});}
window.addEventListener('candidate-data-updated',refreshMap);
setInterval(()=>{if(!document.hidden)refreshMap();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshMap();});
