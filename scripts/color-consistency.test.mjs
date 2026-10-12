import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MARKET_COLORS} from '../dist/market-map.mjs';

const css=await readFile(new URL('../dist/color-consistency.css',import.meta.url),'utf8');
const history=await readFile(new URL('../dist/app.mjs',import.meta.url),'utf8');
const map=await readFile(new URL('../dist/state-map.mjs',import.meta.url),'utf8');
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');

function contrastRatio(a,b) {
  const linear=hex=>{
    const rgb=hex.match(/[a-f0-9]{2}/gi);
    if (!rgb || rgb.length!==3) throw Error('Only six-digit hex is supported');
    const [r,g,blue]=rgb.map(n=>parseInt(n,16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
    return .2126*r+.7152*g+.0722*blue;
  };
  const x=linear(a),y=linear(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
const token=name=>css.match(new RegExp('--'+name+':(#[0-9a-fA-F]{6});'))?.[1];
test('semantic party colors match the actual map palette',()=>{
  assert.equal(token('blue'),MARKET_COLORS.D[3]);
  assert.equal(token('red'),MARKET_COLORS.R[3]);
  assert.ok(map.includes("D:'#235aaa'"));
  assert.ok(map.includes("R:'#b73643'"));
});
test('small text colors on white cards meet WCAG AA contrast',()=>{
  for(const name of ['text','muted','blue','red','gold']){
    const color=token(name);
    assert.ok(color,name+' must be a six-digit CSS color');
    assert.ok(contrastRatio(color,'#ffffff')>=4.5,`${name} insufficient contrast on white`);
  }
});
test('dark surface foregrounds retain high contrast',()=>{
  const navy=token('navy');
  assert.ok(contrastRatio('#f3d79c',navy)>=4.5);
  assert.ok(contrastRatio('#ffffff',navy)>=7);
});
test('history chart uses the shared party palette, with subtle neutral axes',()=>{
  assert.ok(history.includes("stroke:index?'var(--red)':'var(--blue)'"));
  assert.ok(history.includes("stroke:'var(--line)'"));
  assert.ok(history.includes("fill:'var(--muted)'"));
  assert.ok(!history.includes("'#73a6ff'"));
  assert.ok(!history.includes("'#ff8795'"));
});
test('final cascade remains after pre-existing theme, with user labels preserved',()=>{
  assert.ok(html.indexOf('color-consistency.css')>html.indexOf('audit-polish.css'));
  assert.ok(css.includes('.candidate-search-heading .candidate-search-eyebrow {color:#f3d79c;}'));
  assert.ok(css.includes('[aria-pressed=true][data-party="D"]'));
  assert.ok(css.includes('[aria-pressed=true][data-party="R"]'));
});
