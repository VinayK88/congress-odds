import {readFile,writeFile,rename} from 'node:fs/promises';
import {EARLY_CSV,parseEarlyVoteCSV,validateEarlyVote} from '../dist/early-vote-core.mjs';
const file=new URL('../dist/data/early-vote.json',import.meta.url);
const now=new Date().toISOString();
try{
 const response=await fetch(EARLY_CSV,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`HTTP ${response.status}`);
 const text=await response.text();if(text.length>2000000)throw Error('Oversized source');
 const next=parseEarlyVoteCSV(text,now);
 // Accept genuine downward corrections, but never silently roll back source dates.
 let old;try{old=validateEarlyVote(JSON.parse(await readFile(file,'utf8')));}catch{}
 if(old&&old.rows.some(r=>next.rows.find(n=>n.code===r.code)?.asOf<r.asOf))throw Error('Source report date moved backwards');
 await writeFile(new URL(file.href+'.tmp'),JSON.stringify(next,null,2)+'\n');await rename(new URL(file.href+'.tmp'),file);
 console.log(`Updated early-voting reports for ${next.rows.length} jurisdictions.`);
}catch(error){
 let old;try{old=validateEarlyVote(JSON.parse(await readFile(file,'utf8')));}catch{}
 if(old){old.lastAttemptAt=now;old.refreshError='Source retrieval or validation failed; retained the previous snapshot.';await writeFile(file,JSON.stringify(old,null,2)+'\n');}
 console.error(`Early vote refresh failed: ${error.message}`);process.exitCode=1;
}
