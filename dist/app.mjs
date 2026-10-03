import {slugs,parseEvent,pct,markdown} from './data-core.mjs';
const data={schemaVersion:1,electionYear:2026,chambers:{}};
const failures={};
const date=t=>new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
function render(key){
 const c=data.chambers[key],card=document.getElementById(key);
 if(!c){card.querySelector('.status').textContent='Unavailable';card.querySelector('.notice').textContent='Source unavailable. Try refreshing or use the market link.';return;}
 const p=c.parties;
 const oldest=Math.min(...Object.values(p).map(x=>Date.parse(x.updatedAt)));
 const stale=Date.now()-Math.min(Date.parse(c.fetchedAt),oldest)>7200000;
 const closed=Object.values(p).some(x=>x.closed);
 for(const party of ['democratic','republican']){
  const n=card.querySelector(`[data-party="${party}"]`);
  n.replaceChildren(document.createTextNode((p[party].probability*100).toFixed(1)));
  const suffix=document.createElement('span');suffix.textContent='%';n.append(suffix);
  card.querySelector(`[data-bar="${party}"]`).style.width=pct(p[party].probability);
 }
 const status=card.querySelector('.status');status.textContent=closed?'Market closed':stale?'Stale data':failures[key]?'Saved snapshot':'Recent data';status.classList.toggle('stale',stale||!!failures[key]);
 const d=p.democratic.probability,r=p.republican.probability;
 card.querySelector('.outlook').textContent=closed?'Market closed · see source for resolution':d===r?'The parties are priced equally.':`${d>r?'Democrats':'Republicans'} lead by ${(Math.abs(d-r)*100).toFixed(1)} percentage points.`;
 card.querySelector('.retrieved').textContent=`Retrieved ${date(c.fetchedAt)}`;
 card.querySelector('.source-time').textContent=`Source record ${date(oldest)}`;
 card.querySelector('.notice').textContent=[failures[key]?'Refresh failed; showing the last available snapshot.':'',stale?'Data is over 2 hours old. Check the source for current prices.':''].filter(Boolean).join(' ');
 document.getElementById('copy').disabled=!data.chambers.house||!data.chambers.senate;
}
let busy=false;
async function refresh(){
 if(busy)return;busy=true;const button=document.getElementById('refresh');button.disabled=true;button.textContent='Refreshing…';
 await Promise.all(Object.entries(slugs).map(async([key,slug])=>{
  try{const r=await fetch(`https://gamma-api.polymarket.com/events/slug/${slug}`,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('Source error');data.chambers[key]=parseEvent(await r.json(),key);failures[key]=false;}catch{failures[key]=true;}render(key);
 }));
 button.disabled=false;button.textContent='↻ Refresh odds';busy=false;
}
document.getElementById('refresh').addEventListener('click',refresh);
document.getElementById('copy').addEventListener('click',async()=>{
 const text=markdown(data),status=document.getElementById('copy-status');
 try{await navigator.clipboard.writeText(text);status.textContent='Copied the displayed snapshot with timestamps and source links.';}catch{const b=new Blob([text],{type:'text/markdown'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='congress-odds-README.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);status.textContent='Clipboard unavailable. Downloaded the README snapshot instead.';}
});
try{const r=await fetch('./data/latest.json',{cache:'no-store'});if(r.ok){const snapshot=await r.json();for(const key of Object.keys(slugs)){const c=snapshot.chambers?.[key];if(c&&Number.isFinite(Date.parse(c.fetchedAt))&&['democratic','republican'].every(p=>typeof c.parties?.[p]?.probability==='number'&&c.parties[p].probability>=0&&c.parties[p].probability<=1&&Number.isFinite(Date.parse(c.parties[p].updatedAt)))){data.chambers[key]=c;render(key);}}}}catch{}
await refresh();setInterval(refresh,300000);setInterval(()=>Object.keys(slugs).forEach(render),60000);
