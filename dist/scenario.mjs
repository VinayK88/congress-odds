import {STATES,VERIFIED_ON} from './race-data.mjs';
import {PARTIES,races,emptyScenario,validateScenario,seatPartyPreset,tally} from './scenario-core.mjs';
const root=document.querySelector('#race-simulator');
const $=s=>root.querySelector(s);
const KEY='congress-odds-scenario-v1';
let scenario=emptyScenario(),chamber='senate',selected='GA',district='GA-S';
let storageMessage='Your scenarios save on this device.';
try { const saved=localStorage.getItem(KEY);if(saved)scenario=validateScenario(JSON.parse(saved)); }
catch { storageMessage='Saved scenario unavailable. Starting with unassigned races.'; }
function save() { try{localStorage.setItem(KEY,JSON.stringify(scenario));storageMessage='Scenario saved on this device.';}catch{storageMessage='Device storage unavailable. Download your scenario to keep it.';} }
root.innerHTML=`<div class="section-heading"><div><p class="eyebrow">BUILD YOUR PATH TO A MAJORITY</p><h2>The balance is in your hands.</h2></div><span class="model-badge">2026 SCENARIO LAB</span></div>
<p class="section-intro">Choose winners across 35 Senate races and all 435 House districts. Watch the seats add up. <strong>Your scenario is a what-if exercise, not a forecast or election result.</strong></p>
<div class="scenario-toolbar"><div class="chamber-switch" role="group" aria-label="Scenario chamber"><button type="button" data-chamber="senate" aria-pressed="true">Senate · 100 seats</button><button type="button" data-chamber="house" aria-pressed="false">House · 435 seats</button></div><label id="vp-field">Senate tie-break <select id="scenario-vp"><option value="R">Republican VP</option><option value="D">Democratic VP</option><option value="none">No tie-break assumed</option></select></label></div>
<div class="scenario-board"><div class="scenario-score" id="scenario-score" aria-live="polite" aria-atomic="true"></div><div id="seat-dots" class="seat-dots" aria-hidden="true"></div><p id="scenario-base" class="fine"></p></div>
<div class="scenario-layout"><div class="scenario-map-panel"><div class="scenario-map-heading"><h3>Pick a state. Shape the chamber.</h3><label class="sr-only" for="scenario-state">Choose state</label><select id="scenario-state">${STATES.map(s=>`<option value="${s.code}">${s.name}</option>`).join('')}</select></div><p class="fine">Equal-size state tiles · schematic layout, not district boundaries</p><div id="state-tiles" class="state-tiles" role="group" aria-label="States in the scenario"></div><div class="scenario-legend"><span><i class="scenario-key party-D"></i>Democratic</span><span><i class="scenario-key party-R"></i>Republican</span><span><i class="scenario-key party-O"></i>Other</span><span><i class="scenario-key party-U"></i>Unassigned</span></div><p class="fine" id="map-caption"></p></div>
<aside class="race-editor"><p class="eyebrow">YOUR RACE CALL</p><h3 id="editor-state"></h3><p id="editor-context" class="fine"></p><div id="district-list" class="district-list" role="group" aria-label="Districts in selected state"></div><h4 id="editor-race"></h4><div id="party-choices" class="party-choices" role="group" aria-label="Assign selected race">${Object.entries(PARTIES).map(([key,name])=>`<button type="button" data-party="${key}" aria-pressed="false"><i class="scenario-key party-${key}"></i>${name}</button>`).join('')}</div><fieldset id="fill-state"><legend>Assign every district in this state</legend><button type="button" data-fill="D">All Democratic</button><button type="button" data-fill="R">All Republican</button><button type="button" data-fill="U">Clear state</button></fieldset></aside></div>
<div class="scenario-actions"><button type="button" id="scenario-preset">Use current Senate seat parties</button><button type="button" id="scenario-reset">Clear Senate choices</button><button type="button" id="scenario-export">Download scenario</button><label class="scenario-import">Import scenario<input type="file" id="scenario-import" accept="application/json,.json"></label></div><p class="fine" id="scenario-save" role="status"></p>
<details class="model-details"><summary>Seat counts, sources &amp; scenario assumptions</summary><p>The Senate starts with 65 seats not on the 2026 ballot: 34 Democratic-aligned (32 Democrats and two independents) and 31 Republicans. Assign the 33 Class II seats plus Florida and Ohio special elections. The optional current-party preset assigns the 35 contested seats to their seat-holding parties as of ${VERIFIED_ON}; it is not a prediction or candidate list.</p><p>House district numbers cover all 435 voting seats using 2020 Census apportionment. Every House seat starts unassigned. Tiles represent states; they do not show changing district boundaries, candidates or race ratings. Non-voting delegates are excluded.</p><p>Control here means a numerical majority of the full chamber: 218 House seats or 51 Senate seats. In a fully assigned 50–50 Democratic/Republican Senate, the chosen VP breaks the tie (Republican by default). Other or unaffiliated winners are not assigned to a coalition. Assign an independent to a bloc only if that is your scenario assumption. Vacancies, defections, Speaker votes and coalition negotiations are not modeled.</p><p>Sources verified ${VERIFIED_ON}: <a href="https://www.senate.gov/senators/Class_II.htm">Senate Class II</a> · <a href="https://www.senate.gov/general/contact_information/senators_cfm.xml">Senate roster</a> · <a href="https://www.270towin.com/2026-senate-election/">2026 special-election coverage</a> · <a href="https://www.census.gov/library/visualizations/2021/dec/2020-apportionment-map.html">Census apportionment</a> · <a href="https://www.senate.gov/legislative/TieVotes.htm">VP tie-break authority</a>. This static race manifest is not updated by the hourly market refresh.</p></details>`;
function render() {
  const {counts,total,majority,control,tie}=tally(scenario,chamber);
  const status=control?`${PARTIES[control]} ${tie?'control via VP tie-break':'majority'}`:counts.U?'Control still open in your scenario':'No bloc has a majority under these assumptions';
  $('#scenario-score').innerHTML=`<div class="scenario-totals"><div class="blue"><span>DEMOCRATIC-ALIGNED</span><strong>${counts.D}</strong></div><div class="scenario-center"><span>${chamber.toUpperCase()} · YOUR SCENARIO</span><b>${majority} for an outright majority</b></div><div class="red"><span>REPUBLICAN-ALIGNED</span><strong>${counts.R}</strong></div></div><p class="scenario-result">${status}</p><p class="fine">${counts.O} other · ${counts.U} unassigned · ${total} total seats</p>`;
  $('#seat-dots').classList.toggle('house-dots',chamber==='house');
  $('#seat-dots').innerHTML=Object.keys(PARTIES).flatMap(party=>Array.from({length:counts[party]},()=>`<i class="party-${party}"></i>`)).join('');
  $('#scenario-base').textContent=chamber==='senate'?'Includes 65 holdover seats: 34 Democratic-aligned + 31 Republican. Only the 35 contested seats are editable.':'All 435 voting districts are editable. No winners or probabilities are prefilled.';
  $('[data-chamber="senate"]').setAttribute('aria-pressed',String(chamber==='senate'));
  $('[data-chamber="house"]').setAttribute('aria-pressed',String(chamber==='house'));
  $('#vp-field').hidden=chamber!=='senate';$('#scenario-vp').value=scenario.vp;
  $('#scenario-state').value=selected;
  $('#state-tiles').innerHTML=STATES.map(s=>{
    const rr=races(chamber,s.code),n=rr.length,cc={D:0,R:0,O:0,U:0};rr.forEach(r=>cc[scenario[chamber][r.id]||'U']++);
    let at=0;const stops=Object.entries(cc).filter(([,v])=>v).map(([p,v])=>{const start=at;at+=v/(n||1)*100;return `var(--scenario-${p}) ${start}% ${at}%`;});
    const summary=n?`${cc.D} Democratic, ${cc.R} Republican, ${cc.O} other, ${cc.U} unassigned`:'No 2026 Senate contest';
    return `<button type="button" class="state-tile ${n?'':'no-contest'}" data-state="${s.code}" style="grid-column:${s.x+1};grid-row:${s.y+1};--tile-strip:${stops.length?'linear-gradient(to right,'+stops.join(',')+')':'#dad8d1'}" aria-label="${s.name}: ${summary}" aria-pressed="${s.code===selected}" title="${s.name}: ${summary}"><b>${s.code}</b><small>${chamber==='house'?n:n?(scenario[chamber][rr[0].id]||'U'):'—'}</small></button>`;
  }).join('');
  $('#map-caption').textContent=chamber==='senate'?'D / R / O / U shows your assignment. Dashed tiles have no Senate contest in 2026.':'Tile numbers show House seats. The color strip shows your assignments within each state.';
  const state=STATES.find(s=>s.code===selected),rr=races(chamber,selected);
  if(!rr.some(r=>r.id===district))district=rr[0]?.id||null;
  const race=rr.find(r=>r.id===district);
  $('#editor-state').textContent=state.name;
  $('#editor-context').textContent=chamber==='house'?`${state.houseSeats} voting district${state.houseSeats===1?'':'s'}. Select a district, then choose its outcome.`:state.senateParty?`${state.special?'Special election':'Regular Class II election'} · current seat party: ${state.senateParty==='D'?'Democratic':'Republican'}.`:'No Senate seat on the 2026 ballot. Choose another state or switch to House.';
  $('#district-list').hidden=chamber!=='house';
  $('#district-list').innerHTML=chamber==='house'?rr.map(r=>`<button type="button" data-district="${r.id}" class="district-chip assigned-${scenario[chamber][r.id]||'U'}" aria-pressed="${district===r.id}" aria-label="${r.id}: ${PARTIES[scenario[chamber][r.id]||'U']}">${r.id.split('-')[1]}<small>${scenario[chamber][r.id]||'U'}</small></button>`).join(''):'';
  $('#editor-race').textContent=race?`${race.id} · ${race.label}`:'';
  $('#party-choices').hidden=!race;
  root.querySelectorAll('[data-party]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.party===(race?(scenario[chamber][race.id]||'U'):null))));
  $('#fill-state').hidden=chamber!=='house';$('#scenario-preset').hidden=chamber!=='senate';
  $('#scenario-reset').textContent=`Clear ${chamber==='senate'?'Senate':'House'} choices`;
  $('#scenario-save').textContent=storageMessage;
}
function update() {save();render();}
// Re-rendered native map/district buttons retain keyboard focus after selection.
root.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.chamber){chamber=b.dataset.chamber;render();}
  else if(b.dataset.state){selected=b.dataset.state;render();$(`[data-state="${selected}"]`).focus();}
  else if(b.dataset.district){district=b.dataset.district;render();$(`[data-district="${district}"]`).focus();}
  else if(b.dataset.party && district){scenario[chamber][district]=b.dataset.party;update();}
  else if(b.dataset.fill){races(chamber,selected).forEach(r=>scenario[chamber][r.id]=b.dataset.fill);update();}
});
$('#scenario-state').addEventListener('change',e=>{selected=e.target.value;render();});
$('#scenario-vp').addEventListener('change',e=>{scenario.vp=e.target.value;update();});
$('#scenario-preset').addEventListener('click',()=>{scenario.senate=seatPartyPreset();update();});
$('#scenario-reset').addEventListener('click',()=>{scenario[chamber]={};update();});
$('#scenario-export').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify({...validateScenario(scenario),exportedAt:new Date().toISOString(),manifestVerified:VERIFIED_ON},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='congress-odds-scenario.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('#scenario-import').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>100000)throw new Error();const next=validateScenario(JSON.parse(await file.text()));scenario=next;update();$('#scenario-save').textContent='Imported both chambers and the VP assumption. '+storageMessage;}
  catch{$('#scenario-save').textContent='Could not import this file. Use a valid Congress Odds scenario JSON. Your current choices are unchanged.';}
  e.target.value='';
});
render();
