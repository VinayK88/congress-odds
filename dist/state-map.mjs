import {STATES} from './race-data.mjs';
import {STATE_SHAPES} from './state-shapes.mjs';
import {races} from './scenario-core.mjs';
const SMALL=['VT','NH','MA','RI','CT','NJ','DE','MD'];
const COLOR={D:'#235aaa',R:'#b73643',O:'#82724d',U:'#d7d5ce'};
export function stateSummary(chamber,scenario,code) {
 const state=STATES.find(s=>s.code===code),rr=races(chamber,code),counts={D:0,R:0,O:0,U:0};
 rr.forEach(r=>counts[scenario[chamber][r.id]||'U']++);
 return {state,counts,total:rr.length,text:rr.length?`${state.name}: ${counts.D} Democratic, ${counts.R} Republican, ${counts.O} other, ${counts.U} unassigned`:`${state.name}: no 2026 Senate contest`};
}
export function mapMarkup(chamber,scenario,selected) {
 let gradients='';
 const states=STATES.map(s=>{
  const {counts,total,text}=stateSummary(chamber,scenario,s.code),shape=STATE_SHAPES[s.code];
  let fill='#f6f3eb';
  if(total){let at=0;const stops=Object.entries(counts).filter(([,n])=>n).map(([p,n])=>{const start=at;at+=n/total*100;return `<stop offset="${start}%" stop-color="${COLOR[p]}"/><stop offset="${at}%" stop-color="${COLOR[p]}"/>`;}).join('');gradients+=`<linearGradient id="state-paint-${s.code}" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient>`;fill=`url(#state-paint-${s.code})`;}
  return `<g class="map-state ${total?'':'no-contest'}" data-state="${s.code}" role="button" tabindex="0" aria-label="${text}" aria-pressed="${selected===s.code}"><title>${text}</title><path d="${shape.d}" fill="${fill}" fill-rule="evenodd"/>${SMALL.includes(s.code)?'':`<text x="${shape.x}" y="${shape.y}" aria-hidden="true">${s.code}</text>`}</g>`;
 }).join('');
 const shape=STATE_SHAPES[selected];
 return `<svg class="us-state-map" viewBox="-70 0 1060 625" role="group" aria-label="Interactive United States ${chamber==='senate'?'Senate':'House'} scenario map"><defs>${gradients}</defs><g class="state-geography">${states}</g><path class="selected-state-outline" d="${shape.d}" aria-hidden="true"/><text class="map-inset-note" x="75" y="610" aria-hidden="true">ALASKA &amp; HAWAII INSETS</text></svg><div class="small-states" role="group" aria-label="Small states quick selection"><span>NORTHEAST</span>${SMALL.map(code=>{const {text}=stateSummary(chamber,scenario,code);return `<button type="button" data-state="${code}" aria-label="${text}" aria-pressed="${selected===code}">${code}</button>`;}).join('')}</div>`;
}
