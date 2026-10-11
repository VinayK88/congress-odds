import {STATES} from './race-data.mjs';
import {races} from './scenario-core.mjs';
const VALID=new Map(['senate','house'].flatMap(chamber=>races(chamber).map(r=>[r.id,{...r,chamber}])));
const PARTY_LABELS={D:'Democratic',R:'Republican',I:'Independent',L:'Libertarian',G:'Green',O:'Other',U:'Party not supplied'};
export {PARTY_LABELS};
const array=value=>Array.isArray(value)?value:JSON.parse(value||'[]');
const validNumber=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1;
export function safePhoto(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&['polymarket-upload.s3.us-east-2.amazonaws.com','unitedstates.github.io'].includes(u.hostname)?u.href:null;}catch{return null;}}
export function identifyRace(event){
 if(!event||!String(event.endDate).startsWith('2026-11-')||!Array.isArray(event.markets))return null;
 const title=String(event.title||'').trim();
 const senate=/^(.+) Senate Election Winner$/.exec(title);
 if(senate){const state=STATES.find(s=>s.name===senate[1]);return state?VALID.get(state.code+'-S')||null:null;}
 const house=/^([A-Z]{2}-(?:\d{2}|AL)) House Election Winner(?: \((?:by )?[Ii]ndividual\))?$/.exec(title);
 return house?VALID.get(house[1])||null:null;
}
export function parseCandidateEvent(event,fetchedAt=new Date().toISOString()){
 const race=identifyRace(event);if(!race)return null;
 if(!/^[a-z0-9-]+$/.test(event.slug))throw Error('Invalid event slug');
 const candidates=[];
 for(const m of event.markets){
  const label=String(m.groupItemTitle||'').trim();
  if(!label||label.length>150||/^(Person|Candidate)\s+[A-Z0-9]+$/i.test(label)||m.archived||(!m.active&&!m.closed))continue;
  const suffix=/\s*\(([DRILGO])\)\s*$/.exec(label);
  const generic=/^(Democrat(?:ic)?|Republican|Independent|Libertarian|Green)(?: Party)?$/i.exec(label);
  const party=suffix?.[1]||(generic?({democrat:'D',democratic:'D',republican:'R',independent:'I',libertarian:'L',green:'G'}[generic[1].toLowerCase()]):'U');
  const name=generic||/^(Other|None|Field|Yes|No)$/i.test(label)?null:label.replace(/\s*\(([DRILGO])\)\s*$/,'').trim();
  if(name&&!/\p{L}/u.test(name))continue;
  let probability=null;
  try{const outcomes=array(m.outcomes),prices=array(m.outcomePrices),index=outcomes.findIndex(x=>String(x).toLowerCase()==='yes'),raw=prices[index];if(index>=0&&outcomes.length===prices.length&&raw!==null&&raw!==undefined&&['number','string'].includes(typeof raw)&&String(raw).trim()!==''){const p=Number(raw);if(validNumber(p))probability=p;}}catch{}
  if(!/^\d+$/.test(String(m.id))||!/^[a-z0-9-]+$/.test(m.slug||''))continue;
  const closed=Boolean(event.closed||m.closed),active=event.active===true&&m.active===true&&!closed&&m.acceptingOrders!==false;
  const scope=/^Will (?:the )?(?:Democrat(?:ic|s)?|Republican(?:s)?)(?: Party)?\b/i.test(m.question||'')||generic?'party':'individual';
  const image=name?safePhoto(m.image||m.icon):null;
  candidates.push({id:String(m.id),name,label,party,probability:active?probability:null,active,closed,scope,question:String(m.question||label).slice(0,300),url:`https://polymarket.com/event/${event.slug}/${m.slug}`,image:image!==event.image?image:null,imageCredit:image&&image!==event.image?'Polymarket':null});
 }
 if(!candidates.length)return null;
 return {id:race.id,state:race.state,chamber:race.chamber,title:String(event.title).trim(),eventId:String(event.id),url:`https://polymarket.com/event/${event.slug}`,fetchedAt,volume:Number(event.volume)||0,candidates};
}
export function preferRace(a,b){
 if(!a)return b;
 const score=r=>[r.candidates.filter(c=>c.name&&c.scope==='individual'&&c.active).length,r.candidates.filter(c=>c.name&&c.active).length,r.candidates.filter(c=>c.active).length,r.volume];
 const sa=score(a),sb=score(b);for(let i=0;i<sa.length;i++){if(sa[i]!==sb[i])return sb[i]>sa[i]?b:a;}return a;
}
export function validateCandidates(data,now=Date.now()){
 const date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=now+300000;
 const text=(v,max=300)=>typeof v==='string'&&v.length>0&&v.length<=max;
 const source=value=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='polymarket.com'&&!u.username&&!u.password&&/^\/event\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(u.pathname);}catch{return false;}};
 if(data?.schemaVersion!==1||data.electionYear!==2026||!date(data.updatedAt)||!Array.isArray(data.races)||data.races.length>470)throw Error('Invalid candidate snapshot');
 const ids=new Set();
 for(const r of data.races){const manifest=VALID.get(r.id);if(!manifest||manifest.chamber!==r.chamber||manifest.state!==r.state||ids.has(r.id)||!date(r.fetchedAt)||!source(r.url)||!text(r.title)||!Array.isArray(r.candidates)||!r.candidates.length||r.candidates.length>50||!Number.isFinite(r.volume)||r.volume<0)throw Error('Invalid candidate race');ids.add(r.id);const seen=new Set();
  for(const c of r.candidates){if(!text(c.id,30)||seen.has(c.id)||!(c.name===null||text(c.name,150))||!text(c.label,150)||!Object.hasOwn(PARTY_LABELS,c.party)||!['party','individual'].includes(c.scope)||!text(c.question)||!source(c.url)||!(c.probability===null||validNumber(c.probability))||typeof c.active!=='boolean'||typeof c.closed!=='boolean'||((!c.active||c.closed)&&c.probability!==null)||(c.image!==null&&!safePhoto(c.image))||![null,'Polymarket','U.S. Congress / unitedstates'].includes(c.imageCredit))throw Error('Invalid candidate profile');seen.add(c.id);}
 }
 return data;
}
export function candidateFresh(r,now=Date.now()){return now-Date.parse(r.fetchedAt)<=2*3600000;}
