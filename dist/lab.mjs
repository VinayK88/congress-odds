const names={baseline:'No change',ridge:'Ridge',forest:'Random forest',boost:'Gradient boosting',ensemble:'ML ensemble'};
const featureNames={level:'Current price',change_1d:'1-day momentum',change_3d:'3-day momentum',change_7d:'7-day momentum',volatility_7d:'7-day volatility'};
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const pct=p=>(p*100).toFixed(1)+'%';
const day=t=>new Date(t*1000).toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'});
function barRow(label,value,max,note,selected=false){const row=el('div',undefined,'rank-row'+(selected?' selected-rank':''));const top=el('div',undefined,'rank-top');top.append(el('span',label),el('strong',note));const track=el('div',undefined,'rank-track'),fill=el('div',undefined,'rank-fill');fill.style.width=`${max>0?Math.max(0,value/max*100):0}%`;track.append(fill);row.append(top,track);return row;}
export function renderLab(model){
 const contract=document.getElementById('lab-contract').value,m=model?.series?.[contract];
 for(const id of ['lab-metrics','leaderboard','feature-bars','model-rows','backtest-chart'])document.getElementById(id).replaceChildren();
 if(!m?.benchmarks){document.getElementById('leaderboard').append(el('p','Expanded model results are not available yet.','fine'));return;}
 const key=document.getElementById('lab-model').value==='selected'?m.selectedModel:document.getElementById('lab-model').value,b=m.benchmarks[key];
 const metrics=document.getElementById('lab-metrics');
 for(const [label,value,sub] of [['Validation choice',names[m.selectedModel],'Chosen on 30 earlier days'],['Selected test MAE',m.maePP.toFixed(2)+' pp','Compared with '+m.baselineMaePP.toFixed(2)+' pp no-change'],['Training examples',String(m.trainingExamples),'Per contract · expanding window'],['Next daily close',pct(m.forecast),names[m.selectedModel]+' forecast']]){const tile=el('div',undefined,'metric-tile');tile.append(el('span',label),el('strong',value),el('small',sub));metrics.append(tile);}
 const ranked=Object.entries(m.benchmarks).sort((a,b)=>a[1].maePP-b[1].maePP),max=Math.max(...ranked.map(([,b])=>b.maePP));
 for(const [k,b]of ranked){document.getElementById('leaderboard').append(barRow(names[k]+(k===m.selectedModel?' · selected':''),b.maePP,max,b.maePP.toFixed(2)+' pp',k===m.selectedModel));const tr=el('tr');for(const v of [names[k],b.validationMaePP.toFixed(2),b.maePP.toFixed(2),b.rmsePP.toFixed(2),b.directionAccuracy===null?'N/A':b.directionAccuracy.toFixed(1)+'% ('+b.directionDays+' days)',pct(b.forecast)])tr.append(el('td',v));document.getElementById('model-rows').append(tr);}
 document.getElementById('selection-note').textContent=`Validation: ${day(Date.parse(m.selectionStart)/1000)}–${day(Date.parse(m.selectionEnd)/1000)}. Test: ${day(Date.parse(m.testStart)/1000)}–${day(Date.parse(m.testEnd)/1000)}. Ranked by test MAE; ranking does not change the validation choice.`;
 for(const f of [...m.featureImportance].sort((a,b)=>b.importance-a.importance))document.getElementById('feature-bars').append(barRow(featureNames[f.feature],f.importance,1,(f.importance*100).toFixed(1)+'%'));
 drawBacktest(b.backtest,names[key],document.getElementById('lab-scale').value==='full');
 document.getElementById('backtest-caption').textContent=`${names[key]} · ${m.testDays} test days · MAE ${b.maePP.toFixed(2)} pp · RMSE ${b.rmsePP.toFixed(2)} pp. ${document.getElementById('lab-scale').value==='full'?'Full probability scale.':'Detail scale is zoomed; use the selector for 0–100%.'} Hover or focus a point for its exact values.`;
}
function drawBacktest(points,name,full){
 const box=document.getElementById('backtest-chart'),ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 305');
 const add=(tag,attrs,text,parent=svg)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text)e.textContent=text;parent.append(e);return e;};
 const values=points.flatMap(p=>[p.actual,p.predicted]);let lo=0,hi=1;if(!full){lo=Math.max(0,Math.floor((Math.min(...values)-.02)*100)/100);hi=Math.min(1,Math.ceil((Math.max(...values)+.02)*100)/100);}
 const first=points[0].t,last=points.at(-1).t,x=t=>55+(t-first)/(last-first)*920,y=p=>253-(p-lo)/(hi-lo)*223;
 for(let i=0;i<=4;i++){const p=lo+(hi-lo)*i/4;add('line',{x1:55,x2:975,y1:y(p),y2:y(p),class:'plot-grid'});add('text',{x:45,y:y(p)+4,'text-anchor':'end',class:'plot-label'},pct(p));}
 for(const [field,cls] of [['actual','actual-line'],['predicted','prediction-line']]){let d='';points.forEach((p,i)=>{d+=`${i===0||p.t-points[i-1].t>90000?'M':'L'}${x(p.t)},${y(p[field])} `;});add('path',{d,class:cls,fill:'none'});}
 points.forEach(p=>{const text=`${day(p.t)}: actual ${pct(p.actual)}, ${name} ${pct(p.predicted)}, error ${(Math.abs(p.predicted-p.actual)*100).toFixed(2)} pp`;const circle=add('circle',{cx:x(p.t),cy:y(p.predicted),r:5,tabindex:0,class:'plot-point','aria-label':text});add('title',{},text,circle);});
 for(const t of [first,(first+last)/2,last])add('text',{x:x(t),y:281,'text-anchor':t===first?'start':t===last?'end':'middle',class:'plot-label'},day(t));
 box.append(svg);box.setAttribute('aria-label',`${name} historical one-day-ahead forecasts versus actual daily prices. Vertical scale ${pct(lo)} to ${pct(hi)}. Exact data available in the download.`);
}
export function renderPulse(data,history,consensus){
 const board=document.getElementById('pulse-board');board.replaceChildren();
 for(const [chamber,series]of [['house','CONTROLH'],['senate','CONTROLS']]){
 const c=consensus(data,chamber),values=c?.included.map(s=>s.parties.democratic.probability)??[];
 const daily=history?.series?.[`${series}-2026-D`]??[],latest=daily.at(-1),past=latest?daily.find(p=>Math.abs(p.t-(latest.t-7*86400))<=3600):null;
 const spread=values.length>1?(Math.max(...values)-Math.min(...values))*100:null;
 const tile=el('div',undefined,'pulse-tile');tile.append(el('span',(chamber==='house'?'House':'Senate')+' · Democratic price','eyebrow'));
 const strong=el('strong',past?((latest.p-past.p)*100>=0?'+':'')+((latest.p-past.p)*100).toFixed(1)+' pp':'—');tile.append(strong,el('small','7-day Kalshi daily change'));
 const last=daily.slice(-30);if(last.length>1){const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 220 50');svg.setAttribute('aria-hidden','true');const line=document.createElementNS(ns,'polyline');const min=Math.min(...last.map(p=>p.p)),max=Math.max(...last.map(p=>p.p));line.setAttribute('points',last.map((p,i)=>`${i/(last.length-1)*220},${43-(p.p-min)/(max-min||1)*36}`).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','2');svg.append(line);tile.append(svg,el('small','30 daily observations · local scale'));}
 board.append(tile);
 const gap=el('div',undefined,'pulse-tile spread-tile');gap.append(el('span',(chamber==='house'?'House':'Senate')+' · source spread','eyebrow'),el('strong',spread===null?'—':spread.toFixed(1)+' pp'),el('small',values.length>1?`Democratic quotes · ${values.length} eligible sources`:'At least two recent open sources required'));const meter=el('div',undefined,'spread-meter');for(const v of values){const mark=el('i');mark.style.left=(v*100)+'%';mark.title=pct(v);meter.append(mark);}gap.append(meter,el('small','Source prices on a 0–100% scale'));board.append(gap);
 }
}
