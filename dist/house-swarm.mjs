// Interactive, source-backed House bubble atlas. No fabricated forecasts.
import {getCandidateSnapshot} from './candidates.mjs';
import {HOUSE_BANDS,houseDistribution,layoutHouseBubbles} from './house-swarm-core.mjs';
import {STATES} from './race-data.mjs';

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
let selected=null,onlyClose=false,state='';
function setNodeState(node,bubble){
 const isSelected=selected===bubble.id;
 const muted=(state&&bubble.state!==state)||(onlyClose&&bubble.band!=='close');
 node.classList.toggle('is-dimmed',Boolean(muted));
 node.classList.toggle('is-selected',isSelected);
 node.setAttribute('stroke-width',isSelected?'2.5':'1.4');
 node.setAttribute('r',isSelected?bubble.r+2:bubble.r);
}
function raceTitle(b){
 const text=b.leaderName?' · '+b.leaderName:'';
 return b.id+' · '+(partyNames[b.party]||'Unavailable')+text+
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
 target.append(top,lead,note);
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
 target.replaceChildren();
 const graphic=svg('svg',{viewBox:'0 0 1254 664',class:'house-swarm-svg',role:'img',
  'aria-label':'Every one of the 435 House districts as a circle, arranged in seven market-confidence quote bands and an unavailable quotes strip.'});
 graphic.append(svg('title',{},'2026 House district market quote distribution'));
 graphic.append(svg('desc',{},'Columns run from high Democratic Yes prices to high Republican Yes prices. A central band represents races with a quoted leader below 60%. Unavailable races appear in grey at the bottom. Market prices are not election results.'));
 const backdrop=svg('g',{'aria-hidden':'true'});
 backdrop.append(svg('text',{x:627,y:369,'text-anchor':'middle',class:'house-swarm-watermark'},'435'));
 for(let i=0;i<7;i++){
  const band=HOUSE_BANDS[i],center=32+i*170+85;
  if(i===3)backdrop.append(svg('rect',{x:32+i*170+3,y:88,width:164,height:450,rx:11,fill:'#fff9e6'}));
  if(i>0)backdrop.append(svg('line',{x1:32+i*170,y1:87,x2:32+i*170,y2:536,class:'house-swarm-guide'}));
  const mainLabel=i<3?'DEMOCRATIC':i>3?'REPUBLICAN':'CLOSE RACES';
  backdrop.append(
   svg('text',{x:center,y:31,'text-anchor':'middle',class:'house-swarm-column-heading '+(i<3?'is-dem':i>3?'is-rep':'is-close')},String(distribution.counts[band.id])+' · '+mainLabel),
   svg('text',{x:center,y:52,'text-anchor':'middle',class:'house-swarm-column-subtitle'},band.label),
   svg('text',{x:center,y:531,'text-anchor':'middle',class:'house-swarm-axis'},i===3?'LEADER < 60%':i<3?['90%+','75%+','60%+'][i]:['60%+','75%+','90%+'][i-4])
  );
 }
 backdrop.append(svg('line',{x1:32,y1:551,x2:1222,y2:551,class:'house-swarm-divider'}));
 const other=distribution.bubbles.filter(b=>b.party==='O').length;
 backdrop.append(svg('text',{x:34,y:570,class:'house-swarm-no-quote-title'},
  String(distribution.counts.unavailable)+' OTHER / UNAVAILABLE QUOTES'+(other?' · '+other+' OTHER-PARTY LEADERS':'')));
 graphic.append(backdrop);
 const bubbleGroup=svg('g',{class:'house-swarm-dots'});
 const layout=layoutHouseBubbles(distribution);
 for(const b of layout){
  const color=b.party==='O'&&b.band==='unavailable'?colors.other:colors[b.band];
  const circle=svg('circle',{cx:b.x.toFixed(2),cy:b.y.toFixed(2),r:b.r,fill:color[0],stroke:color[1],
   'data-race-id':b.id,'aria-hidden':'true'});
  circle.append(svg('title',{},raceTitle(b)));
  setNodeState(circle,b);
  bubbleGroup.append(circle);
 }
 graphic.append(bubbleGroup);
 target.append(graphic);
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
  const circle=event.target.closest('circle[data-race-id]');
  if(circle)updateSelection(circle.getAttribute('data-race-id'));
 });
 graphic.addEventListener('pointermove',event=>{
  const circle=event.target.closest('circle[data-race-id]');
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
  coverage.classList.toggle('is-archive',distribution.archived||!distribution.hasSnapshot);
 }
 const filterNote=document.getElementById('house-swarm-filter-note');
 if(filterNote){
  filterNote.textContent=(state?'State spotlight: '+(STATES.find(x=>x.code===state)?.name||state)+' · ':'All districts · ')+
    (onlyClose?'Close races highlighted':'All price bands visible')+
    '. Every circle represents one House district.';
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
  drawChart(houseDistribution(snap));
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
  const b=houseDistribution(getCandidateSnapshot()).bubbles.find(r=>r.id===selected);
  showDetail(b||null);
  // Keep the selected dot prominent without changing market data.
  refresh();
 });
 window.addEventListener('candidate-data-updated',refresh);
 refresh();
}
start();
