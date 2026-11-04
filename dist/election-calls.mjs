// Published source-backed race calls. No market odds are used to select winners.
import {validateCalls,countCalls} from './election-calls-core.mjs';
const EMPTY={schemaVersion:1,electionYear:2026,checkedAt:'2026-11-04T00:00:00.000Z',winners:{},sourceStatus:'awaiting-feed',sources:[]};
let latest=EMPTY,loading=false,lastFetch=0;
const make=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e;};
const when=s=>s&&Number.isFinite(Date.parse(s))?new Date(s).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'not yet';
const total=()=>Object.keys(latest.winners||{}).length;
export const getElectionCallsSnapshot=()=>latest;
export function renderCalledResults(){
 const panel=document.getElementById('overview-calls-panel');
 if(!panel)return;
 const results=countCalls(latest,'house'),senate=countCalls(latest,'senate');
 const status=document.getElementById('called-results-status');
 if(status){
  const stale=Date.now()-Date.parse(latest.checkedAt)>45*60000;
  status.textContent='Reported winners · House '+results.D+' Democratic / '+results.R+' Republican · Senate '+senate.D+' Democratic / '+senate.R+' Republican+
   ' · Source checked '+when(latest.checkedAt)+(stale?' · refresh delayed':'');
 }
 const details=document.getElementById('overview-calls');
 if(!details)return;
 details.replaceChildren();
 const headline=make('div','called-results-headline');
 const summary=make('strong','',total()?'Called or certified: '+total()+' races':'Awaiting source-backed race calls');
 headline.append(summary,make('small','',total()?'Race calls are projections until certification.':'No winner data is currently verified by the connected feeds.'));
 details.append(headline);
 const byDate=Object.entries(latest.winners).sort((a,b)=>Date.parse(b[1].updatedAt)-Date.parse(a[1].updatedAt)).slice(0,8);
 if(byDate.length){
  for(const [id,c] of byDate){
   const row=make('div','called-results-row '+(c.party==='D'?'winner-dem':c.party==='R'?'winner-rep':'winner-other'));
   const party=make('span','called-results-party',c.party==='D'?'D':c.party==='R'?'R':'I');
   const body=make('div','called-results-body');
   body.append(make('strong','',id+' · '+c.name),
               make('small','',c.status==='certified'?'Certified · '+c.source:'Called · '+c.source));
   const source=make('a','called-results-link','Source ↗');source.href=c.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';
   row.append(party,body,source);details.append(row);
  }
 }
 const meta=make('p','called-results-footnote','Winner calls are explicitly attributed to named results desks or certification, not prediction markets. Uncalled races stay unassigned. Updated '+when(latest.checkedAt)+'.');
 const attribution=make('a','called-results-link','Sources and methodology ↗');
 attribution.href='https://watch.vote/docs/api-reference/elections';attribution.target='_blank';attribution.rel='noopener noreferrer';
 details.append(meta,attribution);
 panel.dataset.hasCalls=total()>0?'true':'false';
}
export async function refreshElectionCalls(force=false){
 if(loading||!force&&Date.now()-lastFetch<90000)return;
 loading=true;
 try{
  const res=await fetch('data/election-calls.json',{cache:'no-store'});
  if(!res.ok)throw Error('Election calls unavailable: '+res.status);
  const data=validateCalls(await res.json());
  latest=data;lastFetch=Date.now();
  renderCalledResults();
  window.dispatchEvent(new Event('election-calls-updated'));
 }catch(err){
  console.warn('Election calls refresh failed; retaining last checked snapshot.',err);
  const status=document.getElementById('called-results-status');
  if(status)status.textContent='Winner calls feed unavailable · Current market odds are not race results';
 }finally{loading=false}
}
refreshElectionCalls();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshElectionCalls();});
setInterval(()=>{if(!document.hidden)refreshElectionCalls();},120000);
