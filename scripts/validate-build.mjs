import {readFile,readdir,access} from 'node:fs/promises';
import {validateLatest,validateHistory,validateModel} from '../dist/reliability.mjs';
const root=new URL('../dist/',import.meta.url);
for(const [key,validate] of Object.entries({latest:validateLatest,model:validateModel,history:validateHistory}))validate(JSON.parse(await readFile(new URL(`data/${key}.json`,root),'utf8')));
for(const name of await readdir(root)){
 if(!name.endsWith('.mjs'))continue;
 const text=await readFile(new URL(name,root),'utf8');
 for(const match of text.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g))await access(new URL(match[1].split('?')[0],root));
}
const html=await readFile(new URL('index.html',root),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+\.(?:mjs|css|webp))(?:\?[^"\s]*)?"/g))await access(new URL(match[1],root));
console.log('Validated market, model and history snapshots; all local module and page assets exist.');
