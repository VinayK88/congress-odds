import {STATES} from './race-data.mjs';
export const EARLY_SOURCE='https://election.lab.ufl.edu/early-vote/2026-early-voting/';
export const EARLY_CSV='https://election.lab.ufl.edu/data-downloads/earlyvote/2026/US.csv';
export const jurisdictions=[...STATES.map(({code,name})=>({code,name})),{code:'DC',name:'District of Columbia'}].sort((a,b)=>a.name.localeCompare(b.name));
export const earlyFields={total:'voted_all',inPerson:'inperson_all',mail:'accept_all',requested:'request_all'};
const known=new Map(jurisdictions.map(s=>[s.code,s.name]));
export function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&(c===','||c==='\n')){row.push(cell.replace(/\r$/,''));cell='';if(c==='\n'){if(row.some(Boolean))rows.push(row);row=[];}}
  else cell+=c;
 }
 if(quoted)throw Error('Unterminated CSV quote');
 if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}
 const headers=rows.shift()?.map(x=>x.replace(/^\uFEFF/,'').trim());
 if(!headers||new Set(headers).size!==headers.length)throw Error('Invalid CSV header');
 return rows.map(values=>{if(values.length!==headers.length)throw Error('Incomplete CSV row');return Object.fromEntries(headers.map((key,i)=>[key,values[i]]));});
}
function count(value){
 if(value==null||['','NA','N/A','No Data'].includes(value.trim()))return null;
 const s=value.trim().replace(/,/g,'');
 if(!/^\d+$/.test(s)||!Number.isSafeInteger(Number(s)))throw Error('Invalid ballot count');return Number(s);
}
function sourceDate(value){
 const m=/^(\d{1,2})\/(\d{1,2})\/(2026)$/.exec(value??'');if(!m)throw Error('Invalid source date');
 const s=`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
 if(new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error('Invalid calendar date');return s;
}
export function parseEarlyVoteCSV(text,fetchedAt=new Date().toISOString()){
 const records=parseCSV(text);
 const required=['state','state_abbv','last_update','data_source','notes',...Object.values(earlyFields)];
 if(records.length<40||records.length>51||records.some(r=>required.some(k=>!(k in r))))throw Error('Incomplete national early-vote feed');
 const rows=records.map(r=>({code:r.state_abbv,name:r.state,asOf:sourceDate(r.last_update),source:r.data_source==='NA'?'':r.data_source,notes:r.notes==='NA'?'':r.notes,...Object.fromEntries(Object.entries(earlyFields).map(([key,field])=>[key,count(r[field])]))}));
 return validateEarlyVote({schemaVersion:1,electionYear:2026,source:EARLY_SOURCE,dataURL:EARLY_CSV,fetchedAt,rows});
}
export function validateEarlyVote(data,now=Date.now()){
 if(data?.schemaVersion!==1||data.electionYear!==2026||data.source!==EARLY_SOURCE||data.dataURL!==EARLY_CSV||!Number.isFinite(Date.parse(data.fetchedAt))||Date.parse(data.fetchedAt)>now+300000||!Array.isArray(data.rows)||data.rows.length<40||data.rows.length>51)throw Error('Invalid early-vote snapshot');
 const codes=new Set();
 for(const r of data.rows){
  if(known.get(r.code)!==r.name||codes.has(r.code))throw Error('Unknown or duplicate jurisdiction');codes.add(r.code);
  if(!/^2026-\d{2}-\d{2}$/.test(r.asOf)||!Number.isFinite(Date.parse(r.asOf))||new Date(r.asOf).toISOString().slice(0,10)!==r.asOf||Date.parse(r.asOf)>now+86400000)throw Error('Invalid report date');
  for(const key of Object.keys(earlyFields))if(r[key]!==null&&(!Number.isSafeInteger(r[key])||r[key]<0))throw Error('Invalid count');
  if(typeof r.source!=='string'||typeof r.notes!=='string'||r.source.length>2000||r.notes.length>10000)throw Error('Invalid attribution');
 }
 return data;
}
export function earlySummary(rows){return Object.fromEntries(Object.keys(earlyFields).map(key=>{const values=rows.map(r=>r[key]).filter(v=>v!==null);return [key,{value:values.length?values.reduce((a,b)=>a+b,0):null,coverage:values.length}];}));}
export function earlyStatus(row,now=Date.now()){
 if(!row)return 'Not in source';
 if(now-Date.parse(row.asOf+'T23:59:59-04:00')>3*86400000)return 'Older report';
 if(row.total===null)return 'Total not reported';
 return row.total===0?'Zero in source':'Reported';
}
export function safeEarlyLink(value){try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:'?u.href:null;}catch{return null;}}
