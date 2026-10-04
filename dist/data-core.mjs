export const slugs={house:'which-party-will-win-the-house-in-2026',senate:'which-party-will-win-the-senate-in-2026'};
export const parties=['democratic','republican'];
export const sources=['polymarket','kalshi','predictit'];
export const names={polymarket:'Polymarket',kalshi:'Kalshi',predictit:'PredictIt'};
export const tickers={house:'CONTROLH',senate:'CONTROLS'};
const array=v=>Array.isArray(v)?v:JSON.parse(v);
function probability(v){if(v===null||v===undefined||v===''||typeof v==='boolean')throw Error('Missing price');const n=Number(v);if(!Number.isFinite(n)||n<0||n>1)throw Error('Invalid price');return n;}
export function midpoint(bid,ask){bid=probability(bid);ask=probability(ask);if(bid>ask||bid===0||ask===1)throw Error('Crossed or incomplete order book');return (bid+ask)/2;}
export function parseEvent(event,chamber,fetchedAt=new Date().toISOString()){
 if(event.slug!==slugs[chamber]||!Array.isArray(event.markets))throw Error('Unexpected event');
 const result={};
 for(const [key,title] of [['democratic','Democratic Party'],['republican','Republican Party']]){
 const matches=event.markets.filter(m=>m.groupItemTitle===title&&(m.active||m.closed));if(matches.length!==1)throw Error('Missing or ambiguous party');
 const m=matches[0];const i=array(m.outcomes).indexOf('Yes');if(i<0)throw Error('Missing Yes outcome');
 if(!Number.isFinite(Date.parse(m.updatedAt)))throw Error('Missing source timestamp');
 result[key]={probability:probability(array(m.outcomePrices)[i]),marketId:m.id,updatedAt:m.updatedAt,closed:Boolean(m.closed)};
 }
 return {chamber,source:'Polymarket',url:`https://polymarket.com/event/${slugs[chamber]}`,fetchedAt,priceMethod:'Yes outcome price',parties:result};
}
export function parseKalshi(payload,chamber,fetchedAt=new Date().toISOString()){
 const event=payload.event,base=tickers[chamber];if(event?.event_ticker!==`${base}-2026`)throw Error('Unexpected Kalshi event');
 const result={};for(const [key,suffix] of [['democratic','D'],['republican','R']]){
 const matches=(event.markets??payload.markets??[]).filter(m=>m.ticker===`${base}-2026-${suffix}`);if(matches.length!==1)throw Error('Missing Kalshi contract');const m=matches[0];
 result[key]={probability:midpoint(m.yes_bid_dollars,m.yes_ask_dollars),marketId:m.ticker,closed:m.status!=='active'};
 }
 return {chamber,source:'Kalshi',url:`https://kalshi.com/markets/${base.toLowerCase()}/${chamber==='house'?'house-winner':'senate-winner'}/${base.toLowerCase()}-2026`,fetchedAt,priceMethod:'Yes bid/ask midpoint',parties:result};
}
export function parsePredictIt(market,fetchedAt=new Date().toISOString()){
 if(market.id!==8155)throw Error('Unexpected PredictIt market');const result={};
 for(const [key,id] of [['democratic',31947],['republican',31948]]){
 const matches=market.contracts.filter(c=>c.id===id);if(matches.length!==1)throw Error('Missing PredictIt contract');const c=matches[0];result[key]={probability:midpoint(c.bestSellYesCost,c.bestBuyYesCost),marketId:c.id,closed:c.status!=='Open'};
 }
 return {chamber:'senate',source:'PredictIt',url:market.url,fetchedAt,priceMethod:'Yes bid/ask midpoint',sourceTimestampRaw:market.timeStamp,parties:result};
}
export function isStale(c,now=Date.now()){return !c||!Number.isFinite(Date.parse(c.fetchedAt))||now-Date.parse(c.fetchedAt)>7200000;}
export function consensus(data,chamber,now=Date.now()){
 const included=sources.map(s=>data.sources?.[s]?.[chamber]).filter(c=>c&&!isStale(c,now)&&!parties.some(p=>c.parties[p].closed));
 if(!included.length)return null;
 return {included,parties:Object.fromEntries(parties.map(p=>[p,{probability:included.reduce((s,c)=>s+c.parties[p].probability,0)/included.length}]))};
}
export const pct=x=>`${(x*100).toFixed(1)}%`;
export function markdown(data,model){
 const lines=['<!-- CONGRESS_ODDS:START -->','## 2026 U.S. Congress control probabilities','','| Chamber | Source | Democrats | Republicans | Retrieved (UTC) |','| :-- | :-- | --: | --: | :-- |'];
 for(const chamber of Object.keys(slugs))for(const source of sources){const c=data.sources?.[source]?.[chamber];if(c)lines.push(`| ${chamber==='house'?'House':'Senate'} | [${c.source}](${c.url})${isStale(c)?' (stale)':''}${parties.some(p=>c.parties[p].closed)?' (closed)':''} | ${pct(c.parties.democratic.probability)} | ${pct(c.parties.republican.probability)} | ${c.fetchedAt} |`);}
 lines.push('','Polymarket: Yes outcome prices. Kalshi and PredictIt: Yes bid/ask midpoints. PredictIt Senate only; no direct House contract is configured. Prices are independent and may not total 100%. Market rules differ; these are not vote shares or guaranteed results.');
 if(model?.series){lines.push('','### Experimental machine learning — next daily Kalshi price','','Ridge regression forecasts the next daily closing bid/ask midpoint, **not the election result**. Error is walk-forward mean absolute error in percentage points; lower is better.','', '| Contract | Model forecast | Forecast for (UTC) | Model MAE | No-change MAE | Test days |','| :-- | --: | :-- | --: | --: | --: |');for(const m of Object.values(model.series))lines.push(`| ${m.chamber} / ${m.party} | ${pct(m.forecast)} | ${m.forecastFor} | ${m.maePP.toFixed(2)} | ${m.baselineMaePP.toFixed(2)} | ${m.testDays} |`);lines.push('',`Model trained: ${model.trainedAt}. Forecasts expire at their target time. Uses Kalshi history only; no polling or election-outcome training. See the dashboard and model card for limitations.`);}
 lines.push('','<!-- CONGRESS_ODDS:END -->');return lines.join('\n');
}
