// Interactive, source-backed House bubble atlas. No fabricated forecasts.
import {getCandidateSnapshot} from './candidates.mjs';
import {HOUSE_BANDS,houseDistribution,layoutRaceBubbles} from './house-swarm-core.mjs?v=20261104-fit-width';
import {STATES} from './race-data.mjs';
import {getElectionCallsSnapshot} from './election-calls.mjs?v=20261104-winner-overlay';

const ROOT=document.getElementById('house-swarm');
const NS='http://www.w3.org/2000/svg';
const make=(tag,cls,text)=>{
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(text!==undefined)e.textContent=String(text);
 return e;
};
const svg=(tag,attrs={},value)=>{
 const e=document.createElementNS(NS,tag);
 for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
 if(value!==undefined)e.textContent=String(value);
 return e;
};
const fmt=x=>Number.isFinite(x)?(x*100).toFixed(1)+'%':'—';
const localTime=t=>{
 if(!t||!Number.isFinite(Date.parse(t)))return 'unavailable';
 return new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
};
const partyNames={D:'Democratic',R:'Republican',O:'Other / unaffiliated',U:'Unavailable'};
const colors={
 'D-strong':['#c8d8f0','#486dae'],'D-likely':['#d4e0f0','#6a8dc3'],'D-lean':['#e0e8f3','#769acb'],
 close:['#f3d784','#ae8026'],'R-lean':['#f3e0da','#c4786e'],'R-likely':['#f0d3cc','#c76d62'],'R-strong':['#edc6c1','#b44e44'],
 unavailable:['#e1e3e4','#aeb3b8'],other:['#f2d99b','#ae8530']
};
let selected=null,onlyClose=false,state='',winnerView=true;
function setNodeState(node,bubble){
 const isSelected=selected===bubble.id;
 const muted=(state&&bubble.state!==state)||(onlyClose&&bubble.band!=='close');
 node.classList.toggle('is-dimmed',Boolean(muted));
 node.classList.toggle('is-selected',isSelected);
 const circle=node.querySelector('circle');
 if(circle)circle.setAttribute('stroke-width',isSelected?'3':'1.5');
}
function raceTitle(b){
 const text=b.leaderName?' · '+b.leaderName:'';
 return b.id+' · '+(b.called?'CALLED '+(partyNames[b.called.party]||'Other')+' WINNER '+b.called.name:(partyNames[b.party]||'Unavailable')+text)+
  (Number.isFinite(b.probability)?' · '+fmt(b.probability)+' quoted Yes price':' · '+(b.reason||'Market data unavailable'));
}
function legendLine(text,klass){
 const row=make('span','house-swarm-legend-piece');
 row.append(make('i',klass),make('span',undefined,text));
 return row;
}
function showDetail(b){
 const target=document.getElementById('house-swarm-detail');
 if(!target)return;
 target.replaceChildren();
 if(!b){
  target.append(make('h3',undefined,'Inspect a district'),make('p',undefined,'Hover or select a circle to inspect its market quote, or choose a district from the menu. No dots represent certified winners.'));
  return;
 }
 const top=make('div','house-swarm-detail-head');
 top.append(make('h3',undefined,b.id),make('span','house-swarm-detail-party '+(b.party==='D'?'dem':b.party==='R'?'rep':'neutral'),partyNames[b.party]||'Unavailable'));
 const lead=make('p','house-swarm-detail-lead',Number.isFinite(b.probability)?
  fmt(b.probability)+' · '+(b.leaderName||'Quoted party / nominee'):'No eligible market leader');
 const note=make('p','house-swarm-detail-note',Number.isFinite(b.probability)?
  'Highest eligible quoted Yes contract; not a polling margin, probability of a certified result, or an election call.':
  (b.reason||'No recent eligible quote for this district.'));
 target.append(top);
 if(b.called){
  const announced=make('p','called-winner-note '+(b.called.party==='R'?'rep':b.called.party==='O'?'other':''),'✓ '+(b.called.status==='certified'?'Certified':'Called')+' '+(partyNames[b.called.party]||'Other')+' winner: '+b.called.name+' · '+b.called.source);
  target.append(announced);
  const callLink=make('a','house-swarm-detail-link','Verify winner ↗');
  callLink.href=b.called.sourceUrl;callLink.target='_blank';callLink.rel='noopener noreferrer';target.append(callLink);
 }
 target.append(lead,note);
 if(b.pair.length){
  const grid=make('div','house-swarm-detail-pair');
  for(const c of b.pair){
   const item=make('div','house-swarm-detail-contract');
   const name=make('span',undefined,c.name);
   const odds=make('strong',c.party==='D'?'dem':c.party==='R'?'rep':'neutral',fmt(c.probability));
   item.append(name,odds);
   grid.append(item);
  }
  target.append(grid);
 }
 if(b.fetchedAt)target.append(make('p','house-swarm-detail-time','Retrieved '+localTime(b.fetchedAt)+' · Last retrieval is not the last trade time.'));
 const a=make('a','house-swarm-detail-link',b.url?'View contract rules ↗':'Open candidate directory ›');
 a.href=b.url||'#candidates';
 if(b.url){a.target='_blank';a.rel='noopener noreferrer';}
 target.append(a);
}
function drawChart(distribution){
 const target=document.getElementById('house-swarm-plot');
 const tooltip=document.getElementById('house-swarm-tooltip');
 if(!target)return;
 const availableWidth=target.getBoundingClientRect().width||target.clientWidth;
 const geometry=layoutRaceBubbles(distribution,availableWidth),layout=geometry.nodes;
 target.replaceChildren();
 const {width,height,left,bandWidth,axisY,dividerY,unknownTitleY,mainLast}=geometry;
 const graphic=svg('svg',{viewBox:'0 0 '+width+' '+height,class:'house-swarm-svg',role:'img',
  'aria-label':'Every one of the 435 House districts as a circle, arranged in seven market-confidence quote bands and an unavailable quotes strip.'});
 graphic.append(svg('title',{},'2026 House district market quote distribution'));
 graphic.append(svg('desc',{},'Columns run from high Democratic Yes prices to high Republican Yes prices. A central band represents races with a quoted leader below 60%. Unavailable races appear in grey at the bottom. Market prices are not election results.'));
 const backdrop=svg('g',{'aria-hidden':'true'});
 if(geometry.compact){
  for(const section of geometry.sections){
   const index=HOUSE_BANDS.findIndex(b=>b.id===section.id);
   const party=index<0?'unknown':index<3?'is-dem':index>3?'is-rep':'is-close';
   const heading=index<0?'OTHER / UNAVAILABLE':index<3?'DEMOCRATIC':index>3?'REPUBLICAN':'CLOSE RACES';
   const title=heading;
   backdrop.append(svg('rect',{x:9,y:section.top+2,width:width-18,height:49,rx:9,
     fill:index===3?'#fff8e7':index<0?'#f1f2f2':'#f7f6f2'}));
   backdrop.append(svg('text',{x:17,y:section.headerY,class:'house-swarm-column-heading '+party},title));
   backdrop.append(svg('text',{x:17,y:section.headerY+18,class:'house-swarm-column-subtitle'},
    index<0?'Other, stale or unavailable quotes':section.label+' · Market Yes prices'));
   backdrop.append(svg('text',{x:width-17,y:section.headerY,'text-anchor':'end',class:'house-swarm-column-heading '+party},
    section.count+' races'));
   if(section.count===0)backdrop.append(svg('text',{x:width/2,y:section.firstY+4,'text-anchor':'middle',class:'house-swarm-column-subtitle'},'No eligible quotes'));
  }
 }else{
 backdrop.append(svg('text',{x:width/2,y:mainLast+12,'text-anchor':'middle',class:'house-swarm-watermark'},'435'));
 for(let i=0;i<7;i++){
  const band=HOUSE_BANDS[i],center=left+i*bandWidth+bandWidth/2;
  if(i===3)backdrop.append(svg('rect',{x:left+i*bandWidth+5,y:72,width:bandWidth-10,height:Math.max(60,axisY-50),rx:12,fill:'#fff9e6'}));
  if(i>0)backdrop.append(svg('line',{x1:left+i*bandWidth,y1:75,x2:left+i*bandWidth,y2:axisY-2,class:'house-swarm-guide'}));
  const mainLabel=i<3?'DEMOCRATIC':i>3?'REPUBLICAN':'CLOSE RACES';
  backdrop.append(
   svg('text',{x:center,y:29,'text-anchor':'middle',class:'house-swarm-column-heading '+(i<3?'is-dem':i>3?'is-rep':'is-close')},String(distribution.counts[band.id])+' · '+mainLabel),
   svg('text',{x:center,y:49,'text-anchor':'middle',class:'house-swarm-column-subtitle'},band.label),
   svg('text',{x:center,y:axisY,'text-anchor':'middle',class:'house-swarm-axis'},i===3?'LEADER < 60%':i<3?['90%+','75%+','60%+'][i]:['60%+','75%+','90%+'][i-4])
  );
 }
 backdrop.append(svg('line',{x1:left,y1:dividerY,x2:width-left,y2:dividerY,class:'house-swarm-divider'}));
 const other=distribution.bubbles.filter(b=>b.party==='O').length;
 backdrop.append(svg('text',{x:left,y:unknownTitleY,class:'house-swarm-no-quote-title'},
  String(distribution.counts.unavailable)+' OTHER / UNAVAILABLE QUOTES'+(other?' · '+other+' OTHER-PARTY LEADERS':'')));
 }
 graphic.append(backdrop);
 const bubbleGroup=svg('g',{class:'house-swarm-dots'});
 for(const b of layout){
  const palette=winnerView?(b.called?b.called.party==='D'?['#245bad','#153e78']:b.called.party==='R'?['#b74038','#842c29']:['#b58d37','#72581e']:['#e5e7ea','#b4bac3']):(b.party==='O'&&b.band==='unavailable'?colors.other:colors[b.band]);
  const textColor=winnerView?(b.called?'#fff':'#636c75'):b.band==='close'?'#735515':b.party==='D'?'#24518e':b.party==='R'?'#963e35':'#535e68';
  const group=svg('g',{'data-race-id':b.id,class:'house-swarm-bubble'+(winnerView&&b.called?' is-called '+(b.called.party==='D'?'dem':b.called.party==='R'?'rep':'other'):'')});
  const circle=svg('circle',{cx:b.x.toFixed(2),cy:b.y.toFixed(2),r:b.r,fill:palette[0],stroke:palette[1],'stroke-width':1.5});
  const label=svg('text',{x:b.x.toFixed(2),y:(b.y+.3).toFixed(2),'text-anchor':'middle','dominant-baseline':'middle',class:'house-swarm-state-label',fill:textColor},b.state);
  group.append(svg('title',{},raceTitle(b)),circle,label);
  if(winnerView&&b.called)group.append(svg('text',{x:(b.x+b.r*.45).toFixed(2),y:(b.y+b.r*.66).toFixed(2),'text-anchor':'middle','dominant-baseline':'middle',class:'house-swarm-call-mark'},'✓'));
  setNodeState(group,b);
  bubbleGroup.append(group);
 }
 graphic.append(bubbleGroup);
 target.append(graphic);
 if(tooltip)target.append(tooltip);
 const lookup=new Map(layout.map(b=>[b.id,b]));
 function updateSelection(id){
  selected=id;
  for(const element of bubbleGroup.children){
   const b=lookup.get(element.getAttribute('data-race-id'));
   if(b)setNodeState(element,b);
  }
  showDetail(lookup.get(id)||null);
  const select=document.getElementById('house-swarm-district');
  if(select&&selected)select.value=selected;
 }
 graphic.addEventListener('click',event=>{
  const circle=event.target.closest('g[data-race-id]');
  if(circle)updateSelection(circle.getAttribute('data-race-id'));
 });
 graphic.addEventListener('pointermove',event=>{
  const circle=event.target.closest('g[data-race-id]');
  if(!circle||!tooltip){if(tooltip)tooltip.hidden=true;return;}
  const b=lookup.get(circle.getAttribute('data-race-id'));
  if(!b)return;
  tooltip.textContent=raceTitle(b);
  tooltip.hidden=false;
  const rect=target.getBoundingClientRect();
  tooltip.style.left=Math.max(10,Math.min(event.clientX-rect.left+12,rect.width-235))+'px';
  tooltip.style.top=Math.max(10,event.clientY-rect.top-49)+'px';
 });
 graphic.addEventListener('pointerleave',()=>{if(tooltip)tooltip.hidden=true;});
 const menu=document.getElementById('house-swarm-district');
 if(menu){
  menu.replaceChildren();
  const placeholder=make('option',undefined,'Select House district');placeholder.value='';menu.append(placeholder);
  for(const b of [...distribution.bubbles].sort((a,c)=>a.id.localeCompare(c.id))){
   const option=make('option',undefined,b.id);option.value=b.id;menu.append(option);
  }
  menu.value=selected&&lookup.has(selected)?selected:'';
 }
 const filter=document.getElementById('house-swarm-state');
 if(filter&&!filter.options.length){
  const empty=make('option',undefined,'All states');empty.value='';filter.append(empty);
  for(const st of STATES){
   const option=make('option',undefined,st.name);option.value=st.code;filter.append(option);
  }
 }
 if(filter)filter.value=state;
 if(selected&&lookup.has(selected))showDetail(lookup.get(selected));else showDetail(null);
 const coverage=document.getElementById('house-swarm-status');
 const valid=distribution.total-distribution.counts.unavailable;
 if(coverage){
  coverage.textContent=(distribution.archived?'ARCHIVED SNAPSHOT · ':'')+
   valid+' / 435 districts have eligible, classified race quotes · '+distribution.byParty.D+' D · '+distribution.byParty.R+' R · '+
   distribution.counts.close+' close · '+distribution.counts.unavailable+' unavailable / other'+
   (distribution.asOf?' · Snapshot '+localTime(distribution.asOf):' · No saved snapshot');
  const called=distribution.bubbles.filter(b=>b.called);
  coverage.textContent+=' · '+called.length+' called/certified winners ('+
    called.filter(b=>b.called.party==='D').length+' D / '+called.filter(b=>b.called.party==='R').length+' R) · '+
    (winnerView?'SOLID BLUE/RED = CALLED WINNERS; GRAY = NOT CALLED':'COLORS = MARKET QUOTES; CALLS SHOWN IN RACE DETAILS');
  coverage.classList.toggle('is-archive',distribution.archived||!distribution.hasSnapshot);
 }
 const filterNote=document.getElementById('house-swarm-filter-note');
 if(filterNote){
  filterNote.textContent=(state?'State spotlight: '+(STATES.find(x=>x.code===state)?.name||state)+' · ':'All districts · ')+
    (onlyClose?'Close races highlighted':'All price bands visible')+
    '. Each bubble shows its two-letter state; select it for the exact House district ID.';
 }
 ROOT.dataset.archive=String(distribution.archived);
}
function start(){
 if(!ROOT)return;
 const stateInput=document.getElementById('house-swarm-state');
 const closeButton=document.getElementById('house-swarm-close');
 const menu=document.getElementById('house-swarm-district');
 const refresh=()=>{
  const snap=getCandidateSnapshot();
  drawChart(houseDistribution(snap,Date.now(),getElectionCallsSnapshot()));
 };
 if(stateInput)stateInput.addEventListener('change',()=>{state=stateInput.value;refresh();});
 if(closeButton)closeButton.addEventListener('click',()=>{
  onlyClose=!onlyClose;
  closeButton.setAttribute('aria-pressed',String(onlyClose));
  closeButton.textContent=onlyClose?'Show all bands':'Spotlight close races';
  refresh();
 });
 if(menu)menu.addEventListener('change',()=>{
  selected=menu.value||null;
  const b=houseDistribution(getCandidateSnapshot(),Date.now(),getElectionCallsSnapshot()).bubbles.find(r=>r.id===selected);
  showDetail(b||null);
  // Keep the selected dot prominent without changing market data.
  refresh();
 });
 window.addEventListener('candidate-data-updated',refresh);
 window.addEventListener('election-calls-updated',refresh);
 const controls=ROOT.querySelector('.house-swarm-controls');
 if(controls&&!controls.querySelector('.house-swarm-winner-mode')){
  const button=make('button','house-swarm-winner-mode','✓ Called winners');
  button.type='button';button.setAttribute('aria-pressed','true');
  button.title='Toggle between called/certified winners and independent market quotes';
  button.addEventListener('click',()=>{
   winnerView=!winnerView;
   button.setAttribute('aria-pressed',String(winnerView));
   button.textContent=winnerView?'✓ Called winners':'Market odds';
   refresh();
  });
  controls.prepend(button);
 }
 const plot=document.getElementById('house-swarm-plot');
 if(plot&&typeof ResizeObserver==='function'){
  let lastWidth=0;
  const observer=new ResizeObserver(entries=>{
   const width=Math.round(entries[0]?.contentRect?.width||plot.getBoundingClientRect().width);
   if(width>0&&Math.abs(width-lastWidth)>=2){lastWidth=width;refresh();}
  });
  observer.observe(plot);
 }else window.addEventListener('resize',refresh,{passive:true});
 refresh();
}
start();
