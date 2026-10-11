import {STATES} from './race-data.mjs';
import {fetchJson} from './reliability.mjs?v=20261006-robust';
import {validateCandidates,candidateFresh,PARTY_LABELS} from './candidate-core.mjs?v=20261011-candidates';
const $=s=>document.querySelector(s),make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const gallery=$('#candidate-gallery');let snapshot,limit=6,selection,loading=false,failed=false;
const stateName=code=>STATES.find(s=>s.code===code)?.name||code;
const date=t=>new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
function odds(c){return c.probability===null?'—':c.probability>0&&c.probability<.001?'<0.1%':(c.probability*100).toFixed(1)+'%';}
function portrait(c){
 const frame=make('div',undefined,'candidate-portrait');
 const initials=c.name?c.name.split(/\s+/).filter(Boolean).map(n=>n[0]).slice(0,2).join(''):'?';
 frame.append(make('span',initials,'candidate-initials'),make('small','Photo unavailable','photo-fallback'));
 if(c.image){const img=make('img');img.src=c.image;img.alt='Source portrait of '+c.name;img.loading='lazy';img.decoding='async';img.width=225;img.height=275;img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});frame.append(img);}
 return frame;
}
function candidateCard(c,race,compact=false){
 const card=make('article',undefined,'candidate-card candidate-'+c.party+(compact?' candidate-compact':''));
 card.append(portrait(c));
 const body=make('div',undefined,'candidate-body');body.append(make('span',PARTY_LABELS[c.party],'candidate-party'),make('h4',c.name||c.label));
 if(!c.name)body.append(make('p','Candidate name not supplied by this market.','candidate-note'));
 const value=make('div',undefined,'candidate-odds');value.append(make('strong',odds(c)),make('span',c.closed?'Market closed':!c.active?'Not trading':c.probability===null?'Quote unavailable':candidateFresh(race)?'Market-implied chance':'Last quoted · stale'));body.append(value);
 const track=make('div',undefined,'candidate-track'),fill=make('i');fill.style.width=(c.probability===null?0:c.probability*100)+'%';track.append(fill);track.setAttribute('aria-hidden','true');body.append(track);
 body.append(make('span',c.scope==='individual'?'Individual candidate contract':'Party / nominee contract','candidate-contract'));
 const link=make('a','Source & settlement rules ↗');link.href=c.url;link.target='_blank';link.rel='noopener noreferrer';body.append(link);
 if(c.imageCredit&&!compact)body.append(make('small','Image: '+c.imageCredit,'candidate-credit'));
 card.append(body);return card;
}
function raceCard(race){
 const article=make('article',undefined,'candidate-race');const header=make('div',undefined,'candidate-race-heading');const heading=make('div');heading.append(make('p',race.chamber==='senate'?'U.S. SENATE':'U.S. HOUSE · '+race.id,'eyebrow'),make('h3',stateName(race.state)+(race.chamber==='house'?' · '+race.id.split('-')[1]:'')));header.append(heading,make('span',candidateFresh(race)?'Recent snapshot':'Stale snapshot','candidate-fresh'+(candidateFresh(race)?'':' is-stale')));article.append(header);
 const cards=make('div',undefined,'candidate-pair');for(const c of race.candidates)cards.append(candidateCard(c,race));article.append(cards,make('p','Polymarket · retrieved '+date(race.fetchedAt),'candidate-retrieved'));return article;
}
function matching(){
 const chamber=$('#candidate-chamber').value,state=$('#candidate-state').value,query=$('#candidate-search').value.trim().toLowerCase();
 return (snapshot?.races||[]).filter(r=>r.chamber===chamber&&(!state||r.state===state)&&(!query||[r.id,stateName(r.state),...r.candidates.map(c=>c.name||c.label)].join(' ').toLowerCase().includes(query))).sort((a,b)=>{
  if($('#candidate-sort').value==='state')return stateName(a.state).localeCompare(stateName(b.state))||a.id.localeCompare(b.id);
  return b.volume-a.volume||a.id.localeCompare(b.id);
 });
}
function render(){
 if(!gallery)return;
 const items=matching();gallery.replaceChildren();
 for(const r of items.slice(0,limit))gallery.append(raceCard(r));
 if(!items.length)gallery.append(make('p',snapshot?'No matching race profiles. Try another state or candidate name.':failed?'Candidate data could not load. Try Refresh profiles.':'Loading candidate profiles…','candidate-empty'));
 $('#candidate-more').hidden=items.length<=limit;
 $('#candidate-results').textContent=snapshot?`Showing ${Math.min(limit,items.length)} of ${items.length} matching races.`:'';
 const all=snapshot?.races||[],named=all.flatMap(r=>r.candidates).filter(c=>c.name).length,photos=all.flatMap(r=>r.candidates).filter(c=>c.image).length,fresh=all.filter(r=>candidateFresh(r)).length;
 $('#candidate-status').textContent=snapshot?`${named} named market outcomes · ${all.filter(r=>r.chamber==='senate').length}/35 Senate races · ${all.filter(r=>r.chamber==='house').length}/435 House races · ${photos} photo links. ${fresh}/${all.length} snapshots retrieved within 2 hours.${failed?' Refresh failed; retaining the previous snapshot.':''}${Object.keys(snapshot.errors||{}).length?' Some source requests failed; affected timestamps are retained.':''}`:failed?'Candidate data unavailable.':'Retrieving source-backed profiles…';
 renderSidebar();
}
export function getCandidateSnapshot(){return snapshot;}
export function renderRaceCandidates(next){selection=next;renderSidebar();}
function renderSidebar(){
 const box=$('#race-candidate-profiles');if(!box||!selection)return;box.replaceChildren();
 box.append(make('h4','Candidates & market odds'));
 const race=snapshot?.races.find(r=>r.id===selection.raceId);
 if(!race){box.append(make('p',!snapshot?'Candidate profiles are loading.':!selection.raceId?'No Senate contest in this state in 2026.':'No named race market available for this district.','fine'));return;}
 for(const c of race.candidates)box.append(candidateCard(c,race,true));
 box.append(make('p','Retrieved '+date(race.fetchedAt)+'. Market odds do not change your scenario choices.','fine'));
 const button=make('button','Explore these candidate profiles');button.type='button';button.addEventListener('click',()=>{
  $('#candidate-chamber').value=race.chamber;$('#candidate-state').value=race.state;$('#candidate-search').value=race.chamber==='house'?race.id:'';limit=6;render();
  $('#candidates').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});$('#candidate-search').focus({preventScroll:true});
 });box.append(button);
}
async function refresh(){
 if(loading)return;loading=true;const button=$('#candidate-refresh');if(button){button.disabled=true;button.textContent='Refreshing…';}
 try{const next=validateCandidates(await fetchJson('./data/candidates.json',{timeoutMs:12000,attempts:2}));if(!snapshot||Date.parse(next.updatedAt)>=Date.parse(snapshot.updatedAt))snapshot=next;failed=false;try{localStorage.setItem('congress-candidates-v1',JSON.stringify(snapshot));}catch{}}
 catch{failed=true;}
 finally{loading=false;if(button){button.disabled=false;button.textContent='Refresh profiles';}render();window.dispatchEvent(new Event('candidate-data-updated'));}
}
if(gallery){
 for(const state of STATES){const option=make('option',state.name);option.value=state.code;$('#candidate-state').append(option);}
 for(const id of ['candidate-chamber','candidate-state','candidate-sort'])$('#'+id).addEventListener('change',()=>{limit=6;render();});
 $('#candidate-search').addEventListener('input',()=>{limit=6;render();});
 $('#candidate-more').addEventListener('click',()=>{limit+=6;render();});$('#candidate-refresh').addEventListener('click',refresh);
 try{const cached=localStorage.getItem('congress-candidates-v1');if(cached&&cached.length<3000000)snapshot=validateCandidates(JSON.parse(cached));}catch{}
 render();refresh();setInterval(()=>{if(!document.hidden)refresh();},300000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
}
