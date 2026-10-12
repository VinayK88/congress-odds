// Run only after a successful candidate-market discovery.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {emptyRaceHistory,validateRaceHistory,appendRaceSnapshots} from '../dist/race-history-core.mjs';
import {validateCandidates} from '../dist/candidate-core.mjs';
const data=new URL('../dist/data/race-history.json',import.meta.url);
const source=new URL('../dist/data/candidates.json',import.meta.url);
const now=Date.now();
const snapshot=validateCandidates(JSON.parse(await readFile(source,'utf8')),now);
let previous=emptyRaceHistory();
try{previous=validateRaceHistory(JSON.parse(await readFile(data,'utf8')),now);}
catch(error){throw Error('History file is missing or invalid; refusing to overwrite it: '+error.message);}
const {history,additions}=appendRaceSnapshots(previous,snapshot,now);
const temp=new URL('../dist/data/race-history.json.tmp',import.meta.url);
await writeFile(temp,JSON.stringify(history)+'\n','utf8');
await rename(temp,data);
console.log('Race history: '+additions+' genuine snapshot samples appended; '+Object.keys(history.races).length+' races tracked; maximum '+168+' hourly samples per race.');
