# Congress Odds

**[Open the live dashboard](https://vinayk88.github.io/congress-odds/)** · [Automatic updates](https://github.com/VinayK88/congress-odds/actions) · [Model card](MODEL_CARD.md)

Compare Democratic and Republican chances of controlling the 2026 U.S. House and Senate across **Polymarket, Kalshi and PredictIt**. Includes an equal-weight market average, daily history chart and experimental machine learning forecasts.

<!-- CONGRESS_ODDS:START -->
## 2026 U.S. Congress control probabilities

| Chamber | Source | Democrats | Republicans | Retrieved (UTC) |
| :-- | :-- | --: | --: | :-- |
| House | [Polymarket](https://polymarket.com/event/which-party-will-win-the-house-in-2026) | 93.5% | 7.5% | 2026-10-04T08:30:54.939Z |
| House | [Kalshi](https://kalshi.com/markets/controlh/house-winner/controlh-2026) | 91.9% | 8.2% | 2026-10-04T08:30:54.957Z |
| Senate | [Polymarket](https://polymarket.com/event/which-party-will-win-the-senate-in-2026) | 64.5% | 35.5% | 2026-10-04T08:30:54.932Z |
| Senate | [Kalshi](https://kalshi.com/markets/controls/senate-winner/controls-2026) | 63.5% | 36.5% | 2026-10-04T08:30:54.950Z |
| Senate | [PredictIt](https://www.predictit.org/markets/detail/8155/Which-party-will-control-the-Senate-after-the-2026-election) | 64.5% | 37.5% | 2026-10-04T08:30:55.238Z |

Polymarket: Yes outcome prices. Kalshi and PredictIt: Yes bid/ask midpoints. PredictIt Senate only; no direct House contract is configured. Prices are independent and may not total 100%. Market rules differ; these are not vote shares or guaranteed results.

### Experimental machine learning — next daily Kalshi price

Ridge regression forecasts the next daily closing bid/ask midpoint, **not the election result**. Error is walk-forward mean absolute error in percentage points; lower is better.

| Contract | Model forecast | Forecast for (UTC) | Model MAE | No-change MAE | Test days |
| :-- | --: | :-- | --: | --: | --: |
| house / democratic | 91.8% | 2026-10-05T04:00:00Z | 0.28 | 0.25 | 60 |
| house / republican | 8.2% | 2026-10-05T04:00:00Z | 0.32 | 0.28 | 60 |
| senate / democratic | 63.6% | 2026-10-05T04:00:00Z | 0.71 | 0.68 | 60 |
| senate / republican | 36.5% | 2026-10-05T04:00:00Z | 0.73 | 0.63 | 60 |

Model trained: 2026-10-04T08:14:26Z. Forecasts expire at their target time. Uses Kalshi history only; no polling or election-outcome training. See the dashboard and model card for limitations.

<!-- CONGRESS_ODDS:END -->

## Sources and market average

- **Polymarket:** direct House and Senate Yes outcome prices from the Gamma API.
- **Kalshi:** direct House and Senate Yes bid/ask midpoints, using CONTROLH-2026 and CONTROLS-2026.
- **PredictIt:** Senate control market 8155, using Yes bid/ask midpoints. No direct House contract is configured; combined Congress scenarios are not silently converted into House probabilities.
- **Market average:** equal weight per eligible source, calculated separately for each party. A descriptive mean, not a learned or calibrated election forecast. Only open sources retrieved within two hours are eligible. Quotes may still be older than retrieval time.

Party prices are independent, are not normalized, and may not sum to 100%. Markets differ in fees, liquidity, settlement rules and handling of ties. They reflect related information and are not independent evidence. These are not vote shares, seat counts or official results.

Sources: [Polymarket API](https://docs.polymarket.com/api-reference/events/get-event-by-slug), [Kalshi API](https://docs.kalshi.com/api-reference/market/get-market-candlesticks), [PredictIt Senate API](https://www.predictit.org/api/marketdata/markets/8155).

## Machine learning

Four ridge regressions forecast the **next daily closing Kalshi Yes bid/ask midpoint**: one for each party in each chamber. Features are current price, 1/3/7-day changes and 7-day volatility. Models learn next-day price changes from up to 365 daily observations; they do not learn election outcomes. No polls or fundamentals are currently included.

The dashboard reports expanding-window backtests over the last 60 valid daily examples against a no-change baseline. Lower MAE is better. The model can lose to this baseline, and the UI displays that result. Models do not contribute to the market average. See [MODEL_CARD.md](MODEL_CARD.md) for target, validation and limitations; downloadable history and backtest predictions are in `dist/data/`.

## Automatic updates

- GitHub Actions runs hourly at minute 17, retrieves all five source/chamber pairs, updates data and this README's marked section, commits changes and deploys GitHub Pages. GitHub schedules may be delayed or disabled in inactive repositories.
- Source failures retain the previous snapshot **and its original retrieval timestamp**. A stale snapshot is visibly labeled and excluded from the market average. If every source fails, the workflow fails without writing new source data.
- Daily ML training runs after the previous forecast horizon expires. Training failure preserves the older model with its original dates; the website labels expired forecasts. The workflow reports a warning but still publishes fresh source prices.
- The open website reloads saved snapshots and refreshes Polymarket directly every five minutes. Kalshi and PredictIt are refreshed by Actions, avoiding dependence on browser cross-origin permissions.
- No keys or credentials are shipped to the browser. GitHub Pages uses the GitHub Actions source in repository settings.

Retrieval time is not a trade timestamp. Polymarket's record-update timestamp is preserved in JSON. Kalshi's market metadata time is not used as a quote time; PredictIt's timezone-unspecified timestamp is retained verbatim, not interpreted as UTC.

## Local use

Requires Node.js 22+ and Python 3.11+:

```sh
pip install -r scripts/requirements.txt
node --test scripts/data-core.test.mjs
python scripts/test_model.py
node scripts/update-data.mjs
python scripts/train-model.py
node scripts/update-readme.mjs
python scripts/package-source.py
python -m http.server 8000 --directory dist
```

The README marker pair must occur exactly once. `dist/` is the complete static website. The source download is built during deployment and is not committed. The workflow updates this repository's README, not another profile README or the repository About description.
