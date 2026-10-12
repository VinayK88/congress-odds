// Data-grounded, presentation-only state briefing.
// Independent quoted Yes contracts are NOT complementary probabilities.
import {STATES} from './race-data.mjs';
import {races} from './scenario-core.mjs';
import {marketStateSummary,raceLeader} from './market-map.mjs';
import {candidateFresh,safePhoto,PARTY_LABELS} from './candidate-core.mjs';

const make=(tag,text,className)=>{
 const element=document.createElement(tag);
 if(text!==undefined)element.textContent=text;
 if(className)element.className=className;
 return element;
};
export function briefingForState(chamber,code,district,snapshot,now=Date.now()){
 const state=STATES.find(s=>s.code===code);
 if(!state||!['senate','house'].includes(chamber))throw Error('Unknown state or chamber');
 const listed=races(chamber,code);
 const current=chamber==='house'?listed.find(r=>r.id===district)||listed[0]:listed[0];
 const summary=marketStateSummary(chamber,snapshot,code,now);
 const race=current?(snapshot?.races||[]).find(r=>r.id===current.id):null;
 const fresh=Boolean(race&&candidateFresh(race,now));
 const leader=current?raceLeader(race,now):null;
 const contracts=fresh?race.candidates
   .filter(c=>c.active&&!c.closed&&Number.isFinite(c.probability))
   .sort((a,b)=>b.probability-a.probability)
   .slice(0,2).map(c=>({
      label:c.name||c.label,
      party:PARTY_LABELS[c.party]||'Party not supplied',
      partyCode:c.party,
      probability:c.probability,
      scope:c.scope,
      url:c.url,
      image:safePhoto(c.image)
   })):[];
 return {state:state.name,code,chamber,total:listed.length,counts:summary.counts,
   raceId:current?.id||null,raceLabel:current?.label||null,
   isFresh:fresh,reason:leader?.reason||null,
   contracts,sourceUrl:race?.url||null,retrievedAt:race?.fetchedAt||null};
}
const price=p=>p>0&&p<.001?'<0.1%':(p*100).toFixed(1)+'%';
const date=t=>new Date(t).toLocaleString(undefined,{
 month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'
});
function quoteCard(c){
 const card=make('article',undefined,'briefing-quote party-'+c.partyCode);
 const avatar=make('div',undefined,'briefing-avatar');
 const initials=c.label.trim().split(/\s+/).slice(0,2).map(word=>word[0]||'').join('').toUpperCase();
 avatar.append(make('span',initials||'?','briefing-initials'));
 if(c.image){
  const picture=make('img');picture.src=c.image;picture.alt='';
  picture.loading='lazy';picture.decoding='async';picture.referrerPolicy='no-referrer';
  picture.addEventListener('error',()=>picture.remove(),{once:true});
  avatar.append(picture);
 }
 card.append(avatar);
 const body=make('div',undefined,'briefing-quote-content');
 body.append(make('div',c.party,'briefing-party-code'));
 const title=make('strong',c.label,'briefing-candidate-name');
 body.append(title);
 const meta=make('span',(c.scope==='individual'?'Individual':'Party / nominee')+' contract · '+c.party,'briefing-quote-meta');
 body.append(meta);
 card.append(body);
 const gauge=make('div',undefined,'briefing-gauge');
 const number=make('strong',price(c.probability),'briefing-number');
 const track=make('div',undefined,'briefing-track');
 const fill=make('span');fill.style.width=(c.probability*100)+'%';
 track.append(fill);track.setAttribute('aria-hidden','true');
 gauge.append(number,track);
 card.append(gauge);
 const link=make('a','Market ↗','briefing-market-link');
 link.href=c.url;link.target='_blank';link.rel='noopener noreferrer';
 link.setAttribute('aria-label','View quoted market for '+c.label+' (opens new tab)');
 card.append(link);
 return card;
}
export function renderStateBriefing(target,view){
 target.replaceChildren();
 const heading=make('div',undefined,'briefing-heading');
 const kicker=make('p','STATE BRIEFING · '+view.chamber.toUpperCase(),'briefing-kicker');
 const title=make('h4',view.state+' · '+(view.chamber==='senate'?'Senate':(view.raceId||'House')),'briefing-title');
 heading.append(kicker,title);
 if(view.retrievedAt){
  heading.append(make('span',(view.isFresh?'Current source · ':'Expired snapshot · ')+date(view.retrievedAt),
    'briefing-freshness'+(view.isFresh?'':' is-stale')));
 }
 target.append(heading);
 if(view.chamber==='house'){
  const counts=make('div',undefined,'briefing-counts');
  for(const [p,label] of [['D','Democratic'],['R','Republican'],['O','Other'],['U','Unknown']]){
   const item=make('div',undefined,'briefing-count party-'+p);
   item.append(make('strong',String(view.counts[p])),make('span',label));
   counts.append(item);
  }
  target.append(counts,make('p',view.total+' House districts · counts of current market leaders, not seat projections.','briefing-caption'));
 }
 if(view.total===0){
  target.append(make('p','No Senate contest is listed for this state in 2026. Use “Explore House districts” above to see its House races.','briefing-empty'));
  return;
 }
 if(!view.isFresh){
  const msg=view.retrievedAt?
    'The latest race quote is more than two hours old. Prices are hidden until a recent published snapshot is available.':
    'No verified race snapshot is available for this selection yet.';
  target.append(make('p',msg,'briefing-empty'));
 }else if(view.contracts.length===0){
  target.append(make('p','No active eligible quotes are available for this race.','briefing-empty'));
 }else{
  target.append(make('p','Highest two quoted Yes contracts · not vote shares or complementary probabilities.','briefing-caption'));
  const list=make('div',undefined,'briefing-quotes');
  for(const c of view.contracts)list.append(quoteCard(c));
  target.append(list);
 }
 if(view.sourceUrl){
  const source=make('a','View all market contracts and rules ↗','briefing-source');
  source.href=view.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';
  target.append(source);
 }
}
