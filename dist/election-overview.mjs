// Editorial election-night overview, designed for the existing newsroom.
import {overviewControl,overviewSeats,overviewWatch,percent,gaugeAngle} from './election-overview-core.mjs';
import {getCandidateSnapshot} from './candidates.mjs?v=20261012-countdown';

const make=(tag,value,cls)=>{
 const node=document.createElement(tag);
 if(value!==undefined&&value!==null)node.textContent=String(value);
 if(cls)node.className=cls;
 return node;
};
const NS='http://www.w3.org/2000/svg';
const vector=(tag,props={},value)=>{
 const node=document.createElementNS(NS,tag);
 for(const [key,v] of Object.entries(props))node.setAttribute(key,String(v));
 if(value!==undefined)node.textContent=value;
 return node;
};
const polar=(radius,deg)=>{
 const a=deg*Math.PI/180;
 return [160+radius*Math.cos(a),152-radius*Math.sin(a)];
};
const point=p=>p.map(x=>x.toFixed(2)).join(' ');
function wedge(hi,lo){
 const [a,b,c,d]=[polar(122,hi),polar(122,lo),polar(77,lo),polar(77,hi)];
 return `M ${point(a)} A 122 122 0 0 1 ${point(b)} L ${point(c)} A 77 77 0 0 0 ${point(d)} Z`;
}
function gauge(democratic,republican){
 const wrap=make('div',undefined,'overview-gauge');
 const svg=vector('svg',{viewBox:'0 0 320 167',preserveAspectRatio:'xMidYMid meet','aria-hidden':'true',focusable:'false'});
 const colors=['#5a85bf','#8dadd5','#b9cee3','#e4e1dc','#edd1cd','#dba49b','#b9665c'];
 colors.forEach((color,i)=>{
  const hi=180-(i*180/7)-.8,lo=180-((i+1)*180/7)+.8;
  svg.append(vector('path',{d:wedge(hi,lo),fill:color,stroke:'#faf9f6','stroke-width':1.2}));
 });
 // Fine radial marks reinforce the gauge scale without implying a vote count.
 for(let i=0;i<=20;i++){
  const degree=180-i*9;
  const a=polar(124,degree),b=polar(i%5===0?133:129,degree);
  svg.append(vector('line',{x1:a[0].toFixed(2),y1:a[1].toFixed(2),x2:b[0].toFixed(2),y2:b[1].toFixed(2),stroke:i%5===0?'#929caa':'#b8b7b3','stroke-width':i%5===0?1.6:1,'stroke-linecap':'round'}));
 }
 svg.append(
  vector('line',{x1:34,y1:152,x2:286,y2:152,stroke:'#c9c7c1','stroke-width':1.5}),
  vector('text',{x:160,y:112,'text-anchor':'middle',class:'overview-gauge-caption'},'MARKET'),
  vector('text',{x:160,y:126,'text-anchor':'middle',class:'overview-gauge-caption'},'ODDS')
 );
 const a=gaugeAngle(democratic);
 if(a!==null){
  const needle=vector('g',{transform:`rotate(${a.toFixed(2)} 160 152)`});
  needle.append(
   vector('line',{x1:160,y1:152,x2:160,y2:41,stroke:'#a6b7cc','stroke-width':8,'stroke-linecap':'round'}),
   vector('line',{x1:160,y1:152,x2:160,y2:37,stroke:'#2d5997','stroke-width':4.5,'stroke-linecap':'round'})
  );
  svg.append(needle,vector('circle',{cx:160,cy:152,r:10,fill:'#254d82'}),vector('circle',{cx:160,cy:152,r:4,fill:'#fffefa'}));
 }
 wrap.append(svg);
 const key=make('div',undefined,'overview-gauge-key');
 key.append(make('span','DEMOCRATS','overview-key-dem'),make('span','TOSS-UP'),make('span','REPUBLICANS','overview-key-rep'));
 wrap.append(key);
 const leading=democratic===null?'No current market quote':democratic>=republican?`${percent(democratic)} Democrats`:`${percent(republican)} Republicans`;
 wrap.append(make('strong',leading,'overview-gauge-headline'+(democratic!==null&&republican>democratic?' rep':'')));
 wrap.append(make('p',democratic===null?'No fresh eligible price for this view.':`D ${percent(democratic)} · R ${percent(republican)} · independently quoted`,'overview-gauge-detail'));
 return wrap;
}
function probabilityBars(view){
 const grid=make('div',undefined,'overview-prob-grid');
 grid.setAttribute('aria-label','Separate independent Yes-contract probabilities on 0 to 100 percent scales');
 for(const [party,cls,label] of [['democratic','dem','Democrats'],['republican','rep','Republicans']]){
  const p=view.available?view[party]:null;
  const card=make('div',undefined,'overview-prob-card '+cls);
  const line=make('div',undefined,'overview-prob-card-label');
  line.append(make('span',label),make('strong',percent(p)));
  const rail=make('span',undefined,'overview-prob-rail');
  const fill=make('i');
  fill.style.width=Number.isFinite(p)?(p*100).toFixed(2)+'%':'0%';
  rail.append(fill);rail.setAttribute('aria-hidden','true');
  card.append(line,rail);
  grid.append(card);
 }
 return grid;
}
function tallyBar(tally){
 const box=make('div',undefined,'overview-seat-tally');
 if(!tally){
  box.append(make('p','Loading fresh race-level market leaders…','overview-tally-loading'));
  return box;
 }
 const {counts,total,majority,contested,holdovers}=tally;
 box.append(make('div','Market leader seat tally','overview-seats-kicker'));
 const grid=make('div',undefined,'overview-seat-summary');
 const d=make('div',undefined,'overview-party-count dem');
 d.append(make('strong',counts.D),make('small','Democratic-aligned'));
 const mid=make('div',undefined,'overview-party-count mid');
 mid.append(make('strong',total),make('small','Total seats'));
 const r=make('div',undefined,'overview-party-count rep');
 r.append(make('strong',counts.R),make('small','Republican'));
 grid.append(d,mid,r);
 const bar=make('div',undefined,'overview-seat-bar');
 bar.setAttribute('role','img');
 bar.setAttribute('aria-label',`${counts.D} Democratic-aligned leaders, ${counts.R} Republican leaders, ${counts.O} other, ${counts.U} unclear or unavailable, out of ${total} seats. Not an election result.`);
 for(const [p,cls] of [['D','dem'],['O','other'],['U','unknown'],['R','rep']]){
  const segment=make('span',undefined,'seat-segment '+cls);
  segment.style.width=((counts[p]/total)*100).toFixed(3)+'%';
  bar.append(segment);
 }
 const threshold=make('i',undefined,'overview-majority-marker');
 threshold.style.left=(majority/total*100)+'%';
 bar.append(threshold);
 const footer=make('div',undefined,'overview-seat-footer');
 footer.append(make('span',`${counts.U} unclear / unavailable`),make('strong',`${majority} for majority`),make('span',`${counts.O} other`));
 box.append(grid,bar,footer,make('p',tally.holdovers.D+tally.holdovers.R
  ?'Includes Senate holdovers and fresh race-market leaders; not projected winners or calls.'
  :'Fresh district-market leaders only. Unavailable districts are unassigned. Not a seat forecast.','overview-seat-note'));
 return box;
}
function chamberCard(chamber,data,source,snapshot){
 const name=chamber==='senate'?'Senate':'House';
 const view=overviewControl(data,chamber,source);
 const card=make('article',undefined,'overview-chamber-card');
 card.setAttribute('aria-label',name+' market overview');
 const head=make('div',undefined,'overview-card-head');
 head.append(make('h3',name),make('span',view.available?'MARKET ODDS':'UNAVAILABLE','overview-market-badge'));
 const subtitle=make('p',`${view.available?view.sourceLabel:'No fresh source'} · Chance of chamber control`,'overview-card-subtitle');
 card.append(head,subtitle,gauge(view.democratic,view.republican),probabilityBars(view),tallyBar(overviewSeats(snapshot,chamber)));
 const footer=make('div',undefined,'overview-card-footer');
 footer.append(make('span',chamber==='senate'?'35 Senate contests · 100 seats':'435 House seats'));
 const link=make('a','Explore '+name+' races ›');
 link.href='#race-simulator';
 footer.append(link);card.append(footer);
 const dateValue=view.updatedAt?new Date(view.updatedAt):null;
 const dateLabel=dateValue&&Number.isFinite(dateValue.getTime())?dateValue.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):null;
 if(view.available&&dateLabel)card.append(make('p','Latest eligible retrieval: '+dateLabel+' · not last trade time','overview-updated'));
 return card;
}
function avatar(contract){
 const circle=make('span',undefined,'overview-person-avatar');
 circle.append(make('span',(contract.name||'?' ).split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase()));
 if(contract.image){
  const img=make('img');
  img.src=contract.image;img.alt='';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  img.addEventListener('error',()=>img.remove(),{once:true});
  circle.append(img);
 }
 return circle;
}
function watchCard(race){
 const link=make('a',undefined,'overview-race-row');
 link.href=race.url;link.target='_blank';link.rel='noopener noreferrer';
 const top=make('div',undefined,'overview-race-top');
 top.append(make('strong',race.chamber==='senate'?`${race.stateName} · Senate`:`${race.stateName} · ${race.id}`),make('span',race.gapPP.toFixed(1)+' pp quote gap'));
 link.append(top);
 const contenders=make('div',undefined,'overview-contenders');
 for(const contract of race.contracts){
  const group=make('div',undefined,'overview-contender '+(contract.party==='D'?'dem':'rep'));
  const identity=make('div',undefined,'overview-contender-identity');
  identity.append(avatar(contract),make('span',contract.name||'Candidate / party'));
  group.append(identity,make('strong',percent(contract.price)));
  contenders.append(group);
 }
 link.append(contenders);
 const tracks=make('div',undefined,'overview-pair-tracks');
 for(const contract of race.contracts){
  const rail=make('div',undefined,'overview-quote-track '+(contract.party==='D'?'dem':'rep'));
  const fill=make('i');
  fill.style.width=percent(contract.price);rail.append(fill);
  tracks.append(rail);
 }
 link.append(tracks);
 const stamp=new Date(race.quotedAt);
 const label=Number.isFinite(stamp.getTime())?stamp.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—';
 link.append(make('p',`Independently quoted Yes prices · Retrieved ${label} · View contracts ↗`,'overview-quote-note'));
 return link;
}
function renderWatch(snapshot){
 const target=document.getElementById('overview-races');
 if(!target)return;
 target.replaceChildren();
 const watch=overviewWatch(snapshot);
 if(!watch.length){
  target.append(make('p',snapshot?'No comparable, fresh close races right now.':'Loading race quotes for the closest contests…','overview-empty'));
  return;
 }
 for(const race of watch)target.append(watchCard(race));
}
export function renderElectionOverview(data,source='consensus'){
 const target=document.getElementById('overview-chambers');
 if(!target)return;
 const snapshot=getCandidateSnapshot();
 target.replaceChildren(
  chamberCard('senate',data,source,snapshot),
  chamberCard('house',data,source,snapshot)
 );
 renderWatch(snapshot);
 const available=['senate','house'].filter(chamber=>overviewControl(data,chamber,source).available).length;
 const summary=document.getElementById('overview-market-summary');
 if(summary)summary.textContent=available+' of 2 chamber markets have eligible quotes · Source: '+(source==='consensus'?'cash-market average':source==='manifold'?'Manifold (play money)':source);
 const light=document.getElementById('overview-market-light');
 if(light)light.classList.toggle('is-unavailable',available===0);
 const status=document.getElementById('overview-source-status');
 if(status){
  status.textContent='Gauges: '+(source==='consensus'?'equal-weight eligible cash-market prices':source==='manifold'?'Manifold play-money prices':source+' market quotes')+'. Seat bars: Polymarket race leaders, not outcomes.';
 }
}
