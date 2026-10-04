import {readFile,writeFile} from 'node:fs/promises';
import {markdown} from '../dist/data-core.mjs';
const root=new URL('../',import.meta.url),url=new URL('README.md',root);
const data=JSON.parse(await readFile(new URL('dist/data/latest.json',root),'utf8'));
let model;try{model=JSON.parse(await readFile(new URL('dist/data/model.json',root),'utf8'));}catch{}
const readme=await readFile(url,'utf8'),start='<!-- CONGRESS_ODDS:START -->',end='<!-- CONGRESS_ODDS:END -->';
if(readme.split(start).length!==2||readme.split(end).length!==2||readme.indexOf(start)>readme.indexOf(end))throw Error('README needs one ordered marker pair');
await writeFile(url,readme.slice(0,readme.indexOf(start))+markdown(data,model)+readme.slice(readme.indexOf(end)+end.length));
