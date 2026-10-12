// Compact, nonpartisan historical leader-flip dashboard. Render untrusted labels as text.
import {flipLabel,partyName} from './market-flips.mjs';
import {STATES} from './race-data.mjs';
const stateNames=Object.fromEntries(STATES.map(s=>[s.code,s.name]));
const make=(tag,label,klass)=>{
 const el=document.createElement(tag);
 if(label!==undefined)el.textContent=label;
 if(klass)el.className=klass;
 return el;
};
const fmt=seconds=>new Date(seconds*1000).toLocaleString(undefined,{
 month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'
});
export function renderFlipWatch(target,stats,{ready=false,highlight=true}={}){
 target.replaceChildren();
 const intro=make('div',undefined,'flip-head');
 const header=make('div',undefined,'flip-heading');
 header.append(make('p','HISTORICAL MARKET SIGNALS','flip-eyebrow'),
   make('h3','Flip Watch','flip-title'));
 const controls=make('div',undefined,'flip-controls');
 const ranges=make('div',undefined,'flip-ranges');
 ranges.setAttribute('role','group');ranges.setAttribute('aria-label','Flip watch history window');
 for(const [hours,label] of [[24,'24h'],[168,'7d']]){
  const b=make('button',label,'flip-range');
  b.type='button';b.dataset.flipWindow=String(hours);
  b.setAttribute('aria-pressed',String(stats.hours===hours));
  ranges.append(b);
 }
 const toggle=make('button',highlight?'✓ Highlight on map':'Highlight on map','flip-highlight-toggle');
 toggle.type='button';toggle.dataset.flipOverlay='true';
 toggle.setAttribute('aria-pressed',String(highlight));
 controls.append(ranges,toggle);
 intro.append(header,controls);target.append(intro);
 const counts=make('div',undefined,'flip-stats');
 const label=stats.chamber==='senate'?'Senate states':'House districts';
 for(const [number,text] of [
  [stats.flippedRaces,'Changed leader'],
  [stats.flippedStates,'States involved'],
  [stats.compared,'Races compared']
 ]){
  const stat=make('div',undefined,'flip-stat');
  stat.append(make('strong',String(number)),make('span',text));counts.append(stat);
 }
 target.append(counts);
 const explanation=make('p',undefined,'flip-description');
 explanation.textContent=stats.chamber==='senate'?
  'Recorded D ↔ R switches in the 2026 Senate market leader. NOT actual election seat flips or election results.':
  'Recorded D ↔ R switches in individual House district market leaders. Highlighting a state does NOT mean every district flipped.';
 target.append(explanation);
 if(!ready){
  target.append(make('p','Loading the verified price-history archive…','flip-empty'));
  return;
 }
 if(!stats.compared){
  target.append(make('p','Insufficient comparable historical quotes. A race needs at least two recorded observations with known Democratic or Republican leaders before a flip can be verified.','flip-empty'));
  return;
 }
 if(!stats.flips.length){
  target.append(make('p','No verified Democratic ↔ Republican leader switches in this window across '+stats.compared+' comparable '+label.toLowerCase()+'. The watch continues as new snapshots arrive.','flip-empty'));
  return;
 }
 const list=make('div',undefined,'flip-list');
 const cap=Math.min(15,stats.flips.length);
 for(const flip of stats.flips.slice(0,cap)){
  const b=make('button',undefined,'flip-card to-'+flip.to);
  b.type='button';b.dataset.flipRace=flip.raceId;
  b.setAttribute('aria-label',stateNames[flip.state]+' '+flip.raceId+', '+flipLabel(flip)+', '+fmt(flip.at)+'. Select state on map.');
  const summary=make('span',undefined,'flip-card-identity');
  summary.append(make('strong',stateNames[flip.state]||flip.state),
    make('small',stats.chamber==='house'?flip.raceId:'U.S. Senate'));
  const movement=make('span',undefined,'flip-card-movement');
  movement.append(make('strong',flipLabel(flip)),
    make('small',fmt(flip.at)+(flip.switches>1?' · '+flip.switches+' recorded switches':'')));
  const badge=make('span',flip.to==='D'?'→ D':'→ R','flip-direction');
  b.append(summary,movement,badge);list.append(b);
 }
 target.append(list);
 if(cap<stats.flips.length)target.append(make('p','Showing the '+cap+' most recent of '+stats.flips.length+' races with a recorded leader switch.','flip-footnote'));
 target.append(make('p','Gold map outlines indicate states with at least one recorded leader change within this window; current shading still reflects the latest eligible market quote.','flip-footnote'));
}
