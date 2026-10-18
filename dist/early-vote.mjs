import {EARLY_SOURCE,jurisdictions,validateEarlyVote,earlySummary,earlyStatus,safeEarlyLink} from './early-vote-core.mjs?v=20261019-early';
const root=document.getElementById('early-voting');
const n=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const number=value=>value===null?'Not reported':value.toLocaleString('en-US');
const labelDate=s=>new Date(s+'T12:00:00Z').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const fields=[['total','Early ballots reported'],['inPerson','In-person early'],['mail','Mail ballots accepted'],['requested','Mail requested / issued']];
let data;
const select=root.querySelector('#early-state'),status=root.querySelector('#early-status');
for(const s of jurisdictions){const option=n('option',s.name);option.value=s.code;select.append(option);}
function draw(){
 const selected=data.rows.find(r=>r.code===select.value),rows=select.value?(selected?[selected]:[]):data.rows;
 const totals=earlySummary(rows),cards=root.querySelector('#early-kpis');cards.replaceChildren();
 for(const [key,label] of fields){const card=n('article',undefined,'early-kpi');card.append(n('span',label),n('strong',number(totals[key].value)),n('small',select.value?(selected?`Report dated ${labelDate(selected.asOf)}`:'No source row available'):`${totals[key].coverage} jurisdictions with this field`));cards.append(card);}
 const context=root.querySelector('#early-context');
 context.textContent=select.value?(selected?`${selected.name} · ${earlyStatus(selected)}. These are ballot activity counts across the election, not votes for House or Senate candidates.`:'This jurisdiction is not in the current UF source file. Missing does not mean zero.'):`Partial U.S. coverage: ${data.rows.length} of 51 jurisdictions (50 states + D.C.). ${data.rows.filter(r=>r.total>0).length} report positive early-ballot totals. Sums use available reports with different dates, including older reports; they are not complete national turnout.`;
 const chart=root.querySelector('#early-bars');chart.replaceChildren();
 const chartTitle=root.querySelector('#early-chart-title');
 if(select.value){
  chartTitle.textContent=selected?`${selected.name} · source notes`:'Source coverage';
  chart.append(n('p',selected?.notes||'No additional state note supplied by UF Election Lab.','early-note'));
  if(selected){const a=safeEarlyLink(selected.source)?n('a','Original reporting source ↗'):n('p',selected.source||'Original source not specified');if(a.tagName==='A'){a.href=safeEarlyLink(selected.source);a.target='_blank';a.rel='noopener noreferrer';}chart.append(a);}
 }else{
  chartTitle.textContent='Largest reported early-ballot totals';
  const ranking=data.rows.filter(r=>r.total>0).sort((a,b)=>b.total-a.total).slice(0,8),max=ranking[0]?.total;
  if(!ranking.length)chart.append(n('p','No positive totals reported in this snapshot.'));
  for(const r of ranking){const button=n('button',undefined,'early-rank');button.type='button';button.setAttribute('aria-label',`Explore ${r.name}: ${number(r.total)} early ballots, report dated ${labelDate(r.asOf)}. ${earlyStatus(r)}.`);
   const head=n('span',undefined,'early-rank-heading');head.append(n('span',r.name),n('strong',number(r.total)));
   const track=n('span',undefined,'early-rank-track');track.setAttribute('aria-hidden','true');const fill=n('span');fill.style.width=`${r.total/max*100}%`;track.append(fill);
   button.append(head,track,n('small',`${labelDate(r.asOf)} · ${earlyStatus(r)}`));button.addEventListener('click',()=>{select.value=r.code;draw();select.focus();});chart.append(button);
  }
 }
 const body=root.querySelector('#early-rows');body.replaceChildren();
 const visible=select.value?jurisdictions.filter(s=>s.code===select.value):jurisdictions;
 for(const state of visible){const r=data.rows.find(x=>x.code===state.code),tr=n('tr');const name=n('th',state.name);name.scope='row';tr.append(name);for(const [key] of fields)tr.append(n('td',r?number(r[key]):'Not reported'));
  const date=n('td',r?labelDate(r.asOf):'—');date.append(n('small',earlyStatus(r)));tr.append(date);body.append(tr);}
 const age=Date.now()-Date.parse(data.fetchedAt),old=age>48*3600000;
 status.textContent=`${old?'Saved feed is over 48 hours old. ':''}Feed retrieved ${new Date(data.fetchedAt).toLocaleString()}. ${data.refreshError||''} Individual report dates are shown below; retrieval does not make an older state report current.`;
 status.classList.toggle('is-warning',old||Boolean(data.refreshError));
}
select.addEventListener('change',()=>{if(data)draw();});
async function load(){
 try{const r=await fetch('./data/early-vote.json',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();data=validateEarlyVote(await r.json());draw();}
 catch{status.textContent=data?'Could not refresh the saved feed. Retaining the displayed report dates.':'Early-voting data is temporarily unavailable. Use the UF Election Lab source link below.';status.classList.add('is-warning');}
}
load();setInterval(load,15*60000);
