export const slugs = {house:'which-party-will-win-the-house-in-2026',senate:'which-party-will-win-the-senate-in-2026'};
const array = v => Array.isArray(v) ? v : JSON.parse(v);
export function parseEvent(event, chamber, fetchedAt = new Date().toISOString()) {
  if(event.slug !== slugs[chamber] || !Array.isArray(event.markets)) throw new Error('Unexpected market response');
  const parties = {};
  for(const [key,title] of [['democratic','Democratic Party'],['republican','Republican Party']]) {
    const matches = event.markets.filter(m => m.groupItemTitle === title && (m.active || m.closed));
    if(matches.length !== 1) throw new Error(`Missing or ambiguous ${title} market`);
    const m = matches[0], outcomes = array(m.outcomes), prices = array(m.outcomePrices);
    const index = outcomes.indexOf('Yes');
    if(index < 0 || prices[index] == null || prices[index] === '') throw new Error('Missing Yes price');
    const probability = Number(prices[index]);
    if(!Number.isFinite(probability) || probability < 0 || probability > 1) throw new Error('Invalid probability');
    if(!m.updatedAt || !Number.isFinite(Date.parse(m.updatedAt))) throw new Error('Missing source timestamp');
    parties[key] = {probability,marketId:m.id,updatedAt:m.updatedAt,closed:Boolean(m.closed)};
  }
  return {chamber,source:'Polymarket',url:`https://polymarket.com/event/${slugs[chamber]}`,fetchedAt,parties};
}
export const pct = x => `${(x*100).toFixed(1)}%`;
export function markdown(data) {
  return ['<!-- CONGRESS_ODDS:START -->','## 2026 U.S. Congress control probabilities','', '| Chamber | Democrats | Republicans | Retrieved (UTC) |','| :-- | --: | --: | :-- |',...['house','senate'].map(k=>{const c=data.chambers[k];return `| [${k==='house'?'House':'Senate'}](${c.url}) | ${pct(c.parties.democratic.probability)} | ${pct(c.parties.republican.probability)} | ${c.fetchedAt.replace('T',' ').replace(/\.\d+Z$/,'')} |`;}),'','Source: Polymarket market-implied probabilities, not polling percentages or guaranteed outcomes. Independent market prices are shown without normalization and may not total 100%. Check the retrieval dates above; scheduled updates may be delayed.','<!-- CONGRESS_ODDS:END -->'].join('\n');
}
