import {validateScenario} from './scenario-core.mjs';
export function createScenarioHistory(initial,limit=50) {
 let present=validateScenario(initial),past=[],future=[];
 const copy=value=>validateScenario(value);
 return {
  get canUndo(){return past.length>0;},get canRedo(){return future.length>0;},
  commit(next){const clean=copy(next);if(JSON.stringify(clean)!==JSON.stringify(present)){past.push(present);past=past.slice(-limit);present=clean;future=[];}return copy(present);},
  undo(){if(past.length){future.push(present);present=past.pop();}return copy(present);},
  redo(){if(future.length){past.push(present);present=future.pop();}return copy(present);}
 };
}
