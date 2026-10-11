// Shared pointer, touch and keyboard inspection for source-backed SVG charts.
export function attachInspector(box, svg, points, {label, top=30, bottom=253}) {
  if (!points.length) return;
  const ns='http://www.w3.org/2000/svg';
  const line=document.createElementNS(ns,'line');
  for (const [key,value] of Object.entries({y1:top,y2:bottom,class:'inspect-line','aria-hidden':'true'})) line.setAttribute(key,value);
  svg.append(line);
  const panel=document.createElement('div'); panel.className='chart-inspector';
  const heading=document.createElement('div'); heading.className='inspector-heading';
  const date=document.createElement('strong'), hint=document.createElement('span');
  hint.textContent='Move across chart · drag slider · use arrow keys'; heading.append(date,hint);
  const values=document.createElement('div'); values.className='inspector-values';
  const slider=document.createElement('input'); slider.type='range'; slider.min='0';slider.max=String(points.length-1);slider.step='1';slider.setAttribute('aria-label',label+' date');
  panel.append(heading,values,slider);box.append(panel); box.setAttribute('role','group');
  let selected=-1;
  function show(index) {
    index=Math.max(0,Math.min(points.length-1,index)); if(index===selected)return;selected=index;
    const point=points[index];slider.value=String(index);
    date.textContent=new Date(point.t*1000).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
    line.setAttribute('x1',point.x);line.setAttribute('x2',point.x);
    values.replaceChildren();
    for(const item of point.values){const tile=document.createElement('div'),name=document.createElement('span'),value=document.createElement('strong');name.textContent=item.label;value.textContent=item.value;tile.className='inspect-value '+(item.tone||'');tile.append(name,value);values.append(tile);}
    slider.setAttribute('aria-valuetext',date.textContent+'. '+point.values.map(v=>v.label+' '+v.value).join(', '));
  }
  slider.addEventListener('input',()=>show(Number(slider.value)));
  function inspect(event){
    const matrix=svg.getScreenCTM();if(!matrix)return;
    const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
    const x=p.matrixTransform(matrix.inverse()).x;
    let nearest=0;points.forEach((p,i)=>{if(Math.abs(p.x-x)<Math.abs(points[nearest].x-x))nearest=i;});show(nearest);
  }
  svg.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')inspect(event);});
  svg.addEventListener('pointerdown',inspect);
  svg.addEventListener('focusin',event=>{const timestamp=Number(event.target.dataset.timestamp);const i=points.findIndex(p=>p.t===timestamp);if(i>=0)show(i);});
  show(points.length-1);
}
