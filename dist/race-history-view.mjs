// Historical charts use saved Polymarket Gamma observations, not invented series.
import {validateRaceHistory} from './race-history-core.mjs';
import {recordedPriceMovement,movementText} from './race-history-presentation.mjs';
import {fetchJson} from './reliability.mjs?v=20261006-robust';
let archive=null, failed=false,lastRequest=0,windowHours=24,loading=false;
const inspectedAt=new Map(); // Don't reset the user's selected observation on automatic map refresh.
export function getRaceHistory(){return archive;}
export async function refreshRaceHistory(){
 if(loading||Date.now()-lastRequest<60000)return;
 loading=true;lastRequest=Date.now();
 try{
  const fresh=validateRaceHistory(await fetchJson('./data/race-history.json',{timeoutMs:12000,attempts:2}));
  archive=fresh;failed=false;
 }catch{failed=true;}
 finally{loading=false;window.dispatchEvent(new Event('race-history-updated'));}
}
const NS='http://www.w3.org/2000/svg';
const el=(tag,text,cls)=>{
 const e=document.createElement(tag);
 if(text!==undefined)e.textContent=text;
 if(cls)e.className=cls;
 return e;
};
const node=(tag,attributes={})=>{
 const e=document.createElementNS(NS,tag);
 for(const [key,value] of Object.entries(attributes))e.setAttribute(key,String(value));
 return e;
};
const quote=p=>p>0&&p<.001?'<0.1%':(p*100).toFixed(1)+'%';
const fmt=t=>new Date(t*1000).toLocaleString(undefined,{
 month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'
});
const shortTime=t=>new Date(t*1000).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const color=p=>p==='D'?'#235aaa':p==='R'?'#b73643':p==='I'||p==='O'?'#82724d':'#64758e';
function drawLine(chart,points,id,xCoord,yCoord,times){
 const segments=[];let active=false,part='';
 for(const row of times){
  const c=row[1]===id?row[2]:row[3]===id?row[4]:null;
  if(c===null){active=false;continue;}
  part+=(active?'L':'M')+xCoord(row[0]).toFixed(1)+' '+yCoord(c).toFixed(1)+' ';
  active=true;
 }
 if(part.trim())segments.push(part.trim());
 for(const d of segments){
  chart.append(node('path',{d,stroke:color(points.party),fill:'none','stroke-width':2.7,'stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke'}));
 }
 for(const p of points.points){
  const x=xCoord(p[0]),y=yCoord(p[1]);
  chart.append(node('circle',{cx:x.toFixed(1),cy:y.toFixed(1),r:3.7,stroke:'#fff','stroke-width':1.5,fill:color(points.party)}));
 }
}
export function renderRaceHistory(target,raceId){
 target.replaceChildren();
 const heading=el('div',undefined,'race-history-heading');
 const identity=el('div');
 identity.append(el('span','RECORDED PRICE HISTORY','race-history-eyebrow'),el('h5','Market quote timeline','race-history-title'));
 const controls=el('div',undefined,'race-history-controls');
 for(const [hours,label] of [[24,'24 hours'],[168,'7 days']]){
  const button=el('button',label,'race-history-range');button.type='button';
  button.setAttribute('aria-pressed',String(windowHours===hours));
  button.addEventListener('click',()=>{
    windowHours=hours;renderRaceHistory(target,raceId);
    target.querySelectorAll('.race-history-range')[hours===24?0:1]?.focus({preventScroll:true});
  });
  controls.append(button);
 }
 heading.append(identity,controls);target.append(heading);
 const caption=el('p','Polymarket Yes-contract observations collected by this project, up to hourly. No pre-tracking history or inferred prices.','race-history-caption');
 target.append(caption);
 if(!raceId)return;
 if(!archive){
  target.append(el('p',failed?'Historical archive unavailable. Latest race quotes above are unaffected.':'Loading saved historical observations…','race-history-empty'));
  return;
 }
 const entry=archive.races?.[raceId];
 if(!entry?.points?.length){
  target.append(el('p','Tracking has started. There are no stored observations for this race yet; the timeline will appear after verified updates are recorded.','race-history-empty'));
  return;
 }
 const first=entry.points[0][0],last=entry.points.at(-1)[0];
 const cutoff=Date.now()/1000-windowHours*3600;
 const movement=recordedPriceMovement(entry,cutoff),visible=movement.points;
 const stat=el('div',undefined,'race-history-stats');
 stat.append(el('span',entry.points.length+' archived observations','race-history-stat'),
   el('span','First recorded '+shortTime(first),'race-history-stat'),
   el('span','Most recent '+shortTime(last),'race-history-stat'));
 target.append(stat);
 if(!visible.length){
  target.append(el('p','No recorded observations fall inside this range. Select 7 days to see earlier snapshots.','race-history-empty'));
  return;
 }
 // The same cards work for one genuine baseline or multiple historical quotes.
 // We never imply a trend before at least two observations of that contract.
 const motion=el('div',undefined,'race-history-movement');
 motion.append(el('p',visible.length===1?
  'First verified price snapshot · comparison will appear after more genuine observations.':
  'Latest recorded Yes prices · changes since the first available quote of each contract in this range.','race-history-movement-caption'));
 const metricGrid=el('div',undefined,'race-history-movement-grid');
 for(const line of movement.contracts){
  const card=el('article',undefined,'race-history-movement-card party-'+line.party);
  const name=el('span',line.label,'race-history-movement-name');
  const value=el('strong',quote(line.latest),'race-history-movement-price');
  const delta=el('span',movementText(line.deltaPP),'race-history-movement-delta');
  delta.classList.add(line.deltaPP===null?'is-baseline':Math.abs(line.deltaPP)<.05?'is-flat':line.deltaPP>0?'is-up':'is-down');
  const scope=el('small',line.sampleCount+' recorded quote'+(line.sampleCount===1?'':'s')+' · '+shortTime(line.latestTime),'race-history-movement-meta');
  card.append(name,value,delta,scope);metricGrid.append(card);
 }
 motion.append(metricGrid);target.append(motion);
 if(visible.length===1){
  const notice=el('div',undefined,'race-history-first');
  notice.append(el('span','●','race-history-first-dot'),
   el('div','Baseline recorded · '+shortTime(visible[0][0])+' · awaiting another independently retrieved observation. No trend line is drawn yet.','race-history-first-text'));
  target.append(notice);
  return;
 }
 // Contract IDs, rather than candidate names, identify each time series.
 // We chart the top two contracts in the most recent actual archived sample.
 const lines=movement.contracts;
 const legend=el('div',undefined,'race-history-legend');
 for(const line of lines){
  const item=el('span',undefined,'race-history-key');
  const swatch=el('i');swatch.style.backgroundColor=color(line.party);
  item.append(swatch,el('span',line.label));legend.append(item);
 }
 target.append(legend);
 const W=720,H=255,padL=48,padR=15,padTop=17,padBottom=34;
 const xmin=visible[0][0],xmax=visible.at(-1)[0];
 const x=t=>padL+(t-xmin)/(xmax-xmin)*(W-padL-padR);
 const y=p=>padTop+(1-p)*(H-padTop-padBottom);
 const plot=el('div',undefined,'race-history-chart');
 const svg=node('svg',{viewBox:'0 0 720 255',role:'img','aria-label': 'Observed independent Polymarket Yes contract probabilities over time, zero to one hundred percent'});
 svg.classList.add('race-history-svg');
 for(const v of [0,.25,.5,.75,1]){
  const py=y(v);
  svg.append(node('line',{x1:padL,y1:py,x2:W-padR,y2:py,stroke:'#dce5ef','stroke-width':1}));
  const label=node('text',{x:padL-10,y:py+4,'text-anchor':'end',fill:'#4d627e','font-size':11});
  label.textContent=(v*100).toFixed(0)+'%';svg.append(label);
 }
 for(const line of lines)drawLine(svg,line,line.id,x,y,visible);
 const xStart=node('text',{x:padL,y:H-9,fill:'#526984','font-size':10});
 xStart.textContent=shortTime(xmin);svg.append(xStart);
 const xEnd=node('text',{x:W-padR,y:H-9,fill:'#526984','font-size':10,'text-anchor':'end'});
 xEnd.textContent=shortTime(xmax);svg.append(xEnd);
 const cursor=node('line',{x1:x(xmax),x2:x(xmax),y1:padTop,y2:H-padBottom,stroke:'#8a692f','stroke-dasharray':'4 4','stroke-width':1.3});
 svg.append(cursor);
 plot.append(svg);
 const details=el('p',undefined,'race-history-reading');
 plot.append(details);
 const inputWrap=el('div',undefined,'race-history-scrubber');
 const label=el('label','Inspect a recorded quote','race-history-scrub-label');
 const slider=el('input');
 slider.id='race-history-scrub';slider.type='range';slider.min='0';slider.max=String(visible.length-1);
 slider.value=String(visible.length-1);slider.step='1';slider.setAttribute('aria-label','Inspect historical market observations');
 label.htmlFor=slider.id;
 inputWrap.append(label,slider);
 plot.append(inputWrap);
 const select=(index,remember=false)=>{
   index=Math.max(0,Math.min(visible.length-1,index));
   const row=visible[index];
   slider.value=String(index);
   if(remember)inspectedAt.set(raceId,row[0]);
   cursor.setAttribute('x1',x(row[0]));cursor.setAttribute('x2',x(row[0]));
   const texts=lines.map(line=>{
     const p=row[1]===line.id?row[2]:row[3]===line.id?row[4]:null;
     return line.label+': '+(p===null?'not in recorded top two':quote(p));
   });
   details.textContent=fmt(row[0])+' · '+texts.join(' · ');
   slider.setAttribute('aria-valuetext',details.textContent);
 };
 slider.addEventListener('input',()=>select(Number(slider.value),true));
 svg.addEventListener('pointermove',event=>{
   if(event.pointerType==='touch')return;
   const rect=svg.getBoundingClientRect();
   if(!rect.width)return;
   const viewX=(event.clientX-rect.left)/rect.width*W;
   const ratio=Math.max(0,Math.min(1,(viewX-padL)/(W-padL-padR)));
   const t=xmin+ratio*(xmax-xmin);
   let nearest=0,delta=Infinity;
   visible.forEach((p,i)=>{const d=Math.abs(p[0]-t);if(d<delta){delta=d;nearest=i;}});
   select(nearest,true);
 });
 const saved=inspectedAt.get(raceId);
 const initial=saved===undefined?visible.length-1:visible.reduce((best,row,i)=>Math.abs(row[0]-saved)<Math.abs(visible[best][0]-saved)?i:best,0);
 select(initial);
 target.append(plot,el('p','Snapshot cadence is at most once per hour per race; different contracts may not add to 100%. Each point is a real retrieved quote, not a prediction.','race-history-note'));
}
