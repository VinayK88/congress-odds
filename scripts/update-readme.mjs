import {readFile,writeFile} from 'node:fs/promises';
import {markdown} from '../dist/data-core.mjs';
import {validateEarlyVote,earlySummary} from '../dist/early-vote-core.mjs';
const root=new URL('../',import.meta.url),url=new URL('README.md',root);
const data=JSON.parse(await readFile(new URL('dist/data/latest.json',root),'utf8'));
let model;try{model=JSON.parse(await readFile(new URL('dist/data/model.json',root),'utf8'));}catch{}
const readme=await readFile(url,'utf8'),start='<!-- CONGRESS_ODDS:START -->',end='<!-- CONGRESS_ODDS:END -->';
if(readme.split(start).length!==2||readme.split(end).length!==2||readme.indexOf(start)>readme.indexOf(end))throw Error('README needs one ordered marker pair');
let output=readme.slice(0,readme.indexOf(start))+markdown(data,model)+readme.slice(readme.indexOf(end)+end.length);
const early=validateEarlyVote(JSON.parse(await readFile(new URL('dist/data/early-vote.json',root),'utf8'))),summary=earlySummary(early.rows);
const earlyStart='<!-- EARLY_VOTE:START -->',earlyEnd='<!-- EARLY_VOTE:END -->';
if(output.split(earlyStart).length!==2||output.split(earlyEnd).length!==2)throw Error('Missing early-vote README markers');
const earlyText=`${earlyStart}\n\n| Reported ballot activity | Count | Jurisdictions with this field |\n| :-- | --: | --: |\n`+Object.entries({total:'Early ballots',inPerson:'In-person early',mail:'Mail accepted',requested:'Mail requested / issued'}).map(([key,label])=>`| ${label} | ${summary[key].value?.toLocaleString('en-US')??'Not reported'} | ${summary[key].coverage} |`).join('\n')+`\n\nFeed retrieved: ${early.fetchedAt}. Partial coverage: ${early.rows.length} of 51 jurisdictions (50 states + D.C.); report dates vary.${early.refreshError?' '+early.refreshError:''}\n\n${earlyEnd}`;
output=output.slice(0,output.indexOf(earlyStart))+earlyText+output.slice(output.indexOf(earlyEnd)+earlyEnd.length);
await writeFile(url,output);
