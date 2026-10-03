import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {slugs,parseEvent,markdown} from '../dist/data-core.mjs';
const root = new URL('../',import.meta.url);
const chambers = Object.fromEntries(await Promise.all(Object.entries(slugs).map(async([key,slug])=>{
 let last;
 for(let n=0;n<3;n++) {
  try {
   const response=await fetch(`https://gamma-api.polymarket.com/events/slug/${slug}`,{signal:AbortSignal.timeout(20000)});
   if(!response.ok) throw new Error(`Source HTTP ${response.status}`);
   return [key,parseEvent(await response.json(),key)];
  } catch(e){last=e;}
 }
 throw last;
})));
const snapshot={schemaVersion:1,electionYear:2026,chambers};
const readmeURL=new URL('README.md',root);
const readme=await readFile(readmeURL,'utf8');
const start='<!-- CONGRESS_ODDS:START -->',end='<!-- CONGRESS_ODDS:END -->';
if(readme.split(start).length!==2 || readme.split(end).length!==2 || readme.indexOf(start)>readme.indexOf(end)) throw new Error('README needs exactly one ordered marker pair');
const updated=readme.slice(0,readme.indexOf(start))+markdown(snapshot)+readme.slice(readme.indexOf(end)+end.length);
await mkdir(new URL('dist/data/',root),{recursive:true});
await writeFile(new URL('dist/data/latest.json.tmp',root),JSON.stringify(snapshot,null,2)+'\n');
await rename(new URL('dist/data/latest.json.tmp',root),new URL('dist/data/latest.json',root));
await writeFile(readmeURL,updated);
console.log(JSON.stringify(snapshot,null,2));
