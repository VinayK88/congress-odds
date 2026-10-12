// Accessible live-quote battleground briefing. Safe DOM text, never generated HTML.
const make=(tag,text,klass)=>{
 const e=document.createElement(tag);
 if(text!==undefined)e.textContent=text;
 if(klass)e.className=klass;
 return e;
};
const quotedPrice=p=>(p*100).toFixed(1)+'%';
const date=t=>new Date(t).toLocaleString(undefined,{
 month:'short',day:'numeric',hour:'numeric',minute:'2-digit'
});
export function renderBattlegroundRadar(target,data,{ready=false,open=true}={}){
 target.replaceChildren();
 const head=make('div',undefined,'radar-heading');
 const identity=make('div',undefined,'radar-identity');
 identity.append(make('p','LIVE MARKET WATCH','radar-kicker'),
  make('h3','Battleground Radar','radar-title'));
 head.append(identity);
 const controls=make('div',undefined,'radar-controls');
 const toggle=make('button',open?'Hide tight races':'Show tight races','radar-expand');
 toggle.type='button';toggle.dataset.radarToggle='1';
 toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-controls','radar-detail');
 controls.append(toggle);head.append(controls);target.append(head);
 const tagline=make('p','Races with the smallest gap between their two leading Democratic and Republican Yes-contract prices. Not polls, vote margins or election results.','radar-description');
 target.append(tagline);
 const summary=make('div',undefined,'radar-summary');
 const total=make('strong',String(data.count),'radar-count');
 const countlabel=make('span','races within '+data.thresholdPP+' percentage points · '+data.comparable+' comparable fresh contests','radar-count-label');
 summary.append(total,countlabel);
 target.append(summary);
 const body=make('div',undefined,'radar-detail');body.id='radar-detail';body.hidden=!open;
 const thresholds=make('div',undefined,'radar-filter');
 thresholds.setAttribute('role','group');thresholds.setAttribute('aria-label','Market quote gap filter');
 thresholds.append(make('span','MAX QUOTE GAP','radar-filter-label'));
 for(const pp of [5,10,20]){
  const b=make('button',String(pp)+' pp','radar-threshold');
  b.type='button';b.dataset.radarThreshold=String(pp);
  b.setAttribute('aria-pressed',String(data.thresholdPP===pp));
  thresholds.append(b);
 }
 body.append(thresholds);
 if(!ready){
  body.append(make('p','Waiting for the verified race-market snapshot. No contest is ranked until quotes load.','radar-empty'));
 }else if(!data.comparable){
  body.append(make('p','No comparable fresh D vs R contract pairs are available right now. Stale or incomplete prices are excluded.','radar-empty'));
 }else if(!data.count){
  body.append(make('p','No comparable races fall within '+data.thresholdPP+' percentage points. Choose a wider gap to see more contests.','radar-empty'));
 }else{
  const list=make('div',undefined,'radar-list');
  const cap=Math.min(8,data.close.length);
  for(const race of data.close.slice(0,cap)){
   const b=make('button',undefined,'radar-card');
   b.type='button';b.dataset.radarRace=race.id;
   const name=make('span',undefined,'radar-race-name');
   name.append(make('strong',race.stateName||race.state),
     make('small',race.chamber==='house'?race.id:'U.S. Senate'));
   const details=make('span',undefined,'radar-candidates');
   for(const contract of race.contracts){
    const c=make('span',undefined,'radar-party party-'+contract.party);
    c.append(make('span',contract.name,'radar-person'),
      make('strong',quotedPrice(contract.price),'radar-price'));
    details.append(c);
   }
   const indicator=make('span',undefined,'radar-indicator');
   indicator.append(make('strong',race.leader==='TIED'?'Tied':race.gapPP.toFixed(1)+' pp','radar-gap'),
     make('small','quoted gap','radar-gap-caption'));
   const stamp=make('span','Retrieved '+date(race.quotedAt),'radar-retrieved');
   b.append(name,details,indicator,stamp);
   b.setAttribute('aria-label',(race.stateName||race.state)+' '+race.id+
     ', independent market contract gap '+race.gapPP.toFixed(1)+' percentage points. Open selected race.');
   list.append(b);
  }
  body.append(list);
  if(cap<data.close.length)body.append(make('p','Showing the '+cap+' tightest of '+data.count+' qualifying races.','radar-footnote'));
 }
 body.append(make('p','A 5 pp gap means a 5 percentage-point difference between two separate quoted Yes contracts; it does not mean a five-point polling margin. Both contracts retain their original prices.','radar-footnote'));
 target.append(body);
}
