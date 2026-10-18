import {sources,names,parties,pct,isStale} from './data-core.mjs?v=20261018-sources';

const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const labels={democratic:'Democrats',republican:'Republicans'};
const initials={polymarket:'P',kalshi:'K',predictit:'PI',manifold:'M'};

// Render the same validated, independently quoted values as the detailed table.
export function createMarketBriefing(root){
 if(!root)return ()=>{};
 let snapshot={sources:{}},filter='both',failures={};
 const toolbar=node('div',undefined,'briefing-toolbar');
 const copy=node('div');copy.append(node('h3','Four markets. One clear view.'),node('p','Compare independent Yes prices on the same 0–100% scale.'));
 const controls=node('div',undefined,'briefing-filters');controls.setAttribute('role','group');controls.setAttribute('aria-label','Filter comparison by party');
 for(const [value,label] of [['both','Both parties'],['democratic','Democrats'],['republican','Republicans']]){
  const button=node('button',label);button.type='button';button.dataset.party=value;
  button.addEventListener('click',()=>{filter=value;draw();});controls.append(button);
 }
 toolbar.append(copy,controls);
 const panels=node('div',undefined,'briefing-panels');
 const announcement=node('p',undefined,'sr-only');announcement.setAttribute('role','status');
 root.append(toolbar,panels,announcement);
 function draw(){
  for(const button of controls.children)button.setAttribute('aria-pressed',String(button.dataset.party===filter));
  announcement.textContent=`Showing ${filter==='both'?'both parties':labels[filter]} for House and Senate.`;
  panels.replaceChildren();
  for(const chamber of ['house','senate']){
   const panel=node('article',undefined,'briefing-panel');
   const header=node('div',undefined,'briefing-panel-head');
   const title=node('div');title.append(node('span',chamber==='house'?'THE LOWER CHAMBER':'THE UPPER CHAMBER','briefing-kicker'),node('h4',chamber==='house'?'House':'Senate'));
   header.append(title,node('span',chamber==='house'?'435 seats':'100 seats','briefing-seats'));panel.append(header);
   const axis=node('div',undefined,'briefing-axis');axis.setAttribute('aria-hidden','true');for(const label of ['0%','50%','100%'])axis.append(node('span',label));panel.append(axis);
   for(const source of sources){
    const c=snapshot.sources?.[source]?.[chamber];
    const closed=c&&parties.some(p=>c.parties[p].closed),stale=c&&isStale(c);
    const row=node('div',undefined,'briefing-source'+(!c||closed||stale?' briefing-unavailable':''));
    const heading=node('div',undefined,'briefing-source-head'),identity=node('div',undefined,'briefing-identity');
    const icon=node('span',initials[source],'briefing-source-icon');icon.setAttribute('aria-hidden','true');identity.append(icon,node('strong',names[source]));
    const status=!c?'Unavailable':closed?'Closed':stale?'Stale':source==='manifold'?'Play money':'Cash market';
    heading.append(identity,node('span',status,'briefing-source-kind'));row.append(heading);
    for(const party of (filter==='both'?parties:[filter])){
     const line=node('div',undefined,`briefing-quote ${party}`);
     const partyLabel=node('span',party==='democratic'?'D':'R','briefing-party');partyLabel.setAttribute('aria-label',labels[party]);
     const track=node('div',undefined,'briefing-track');track.setAttribute('aria-hidden','true');
     if(c){const fill=node('span',undefined,'briefing-fill');fill.style.width=pct(c.parties[party].probability);track.append(fill);}
     const quote=node(c?'a':'span',c?pct(c.parties[party].probability):'—','briefing-value');
     if(c){quote.href=c.parties[party].url??c.url;quote.target='_blank';quote.rel='noopener noreferrer';quote.setAttribute('aria-label',`${names[source]}, ${chamber}, ${labels[party]}: ${pct(c.parties[party].probability)}. ${status}. Open source contract.`);}
     line.append(partyLabel,track,quote);row.append(line);
    }
    const failed=snapshot.errors?.[`${source}/${chamber}`]||failures[`${source}/${chamber}`];
    const time=c?new Date(c.fetchedAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}):null;
    row.append(node('p',c?`${closed?'Closed · ':stale?'Stale · ':''}Retrieved ${time}${failed?' · Refresh failed; retained snapshot':''}`:failed?'Retrieval failed · retry scheduled':'Awaiting source snapshot','briefing-time'));
    panel.append(row);
   }
   panels.append(panel);
  }
 }
 return (data,liveFailures={})=>{snapshot=data;failures=liveFailures;draw();};
}
