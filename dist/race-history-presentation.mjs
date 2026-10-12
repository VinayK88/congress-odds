// View-model for genuine recorded Yes-contract quotes. Do not interpolate.
export function recordedPriceMovement(entry,cutoffSeconds=0){
 if(!entry||!Array.isArray(entry.points))return {points:[],contracts:[]};
 const points=entry.points.filter(row=>row[0]>=cutoffSeconds);
 if(!points.length)return {points:[],contracts:[]};
 const last=points.at(-1),ids=[last[1],last[3]];
 const contracts=ids.map(id=>{
  const samples=points
   .map(row=>row[1]===id?[row[0],row[2]]:row[3]===id?[row[0],row[4]]:null)
   .filter(Boolean);
  const first=samples[0],recent=samples.at(-1);
  return {
   id,label:entry.contracts?.[id]?.label||'Contract '+id,
   party:entry.contracts?.[id]?.party||'U',
   firstTime:first?.[0]??null,latestTime:recent?.[0]??null,
   latest:recent?.[1]??null,
   deltaPP:samples.length>=2?(recent[1]-first[1])*100:null,
   sampleCount:samples.length,points:samples
  };
 });
 return {points,contracts,firstTime:points[0][0],lastTime:last[0]};
}
export function movementText(deltaPP){
 if(deltaPP===null||!Number.isFinite(deltaPP))return 'Baseline only';
 const rounded=Math.abs(deltaPP).toFixed(1);
 if(Number(rounded)===0)return 'No visible change';
 return (deltaPP>0?'↑ +':'↓ −')+rounded+' pp';
}
