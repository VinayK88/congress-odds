# Congress Odds

**[Open the live dashboard](https://vinayk88.github.io/congress-odds/)** · [Automatic updates](https://github.com/VinayK88/congress-odds/actions) · [Model card](MODEL_CARD.md)

Compare Democratic and Republican chances of controlling the 2026 U.S. House and Senate across **Polymarket, Kalshi and PredictIt**. Includes an equal-weight market average, daily history chart and experimental machine learning forecasts.

<!-- CONGRESS_ODDS:START -->
## 2026 U.S. Congress control probabilities

| Chamber | Source | Democrats | Republicans | Retrieved (UTC) |
| :-- | :-- | --: | --: | :-- |
| House | [Polymarket](https://polymarket.com/event/which-party-will-win-the-house-in-2026) | 90.5% | 9.5% | 2026-10-08T21:21:10.033Z |
| House | [Kalshi](https://kalshi.com/markets/controlh/house-winner/controlh-2026) | 90.1% | 10.0% | 2026-10-08T21:21:10.039Z |
| Senate | [Polymarket](https://polymarket.com/event/which-party-will-win-the-senate-in-2026) | 63.5% | 35.5% | 2026-10-08T21:21:10.032Z |
| Senate | [Kalshi](https://kalshi.com/markets/controls/senate-winner/controls-2026) | 61.5% | 38.5% | 2026-10-08T21:21:10.042Z |
| Senate | [PredictIt](https://www.predictit.org/markets/detail/8155/Which-party-will-control-the-Senate-after-the-2026-election) | 65.0% | 38.0% | 2026-10-08T21:21:10.493Z |

Polymarket: Yes outcome prices. Kalshi and PredictIt: Yes bid/ask midpoints. PredictIt Senate only; no direct House contract is configured. Prices are independent and may not total 100%. Market rules differ; these are not vote shares or guaranteed results.

### Experimental machine learning — next daily Kalshi price

Ridge, random forest, gradient boosting and their ensemble forecast the next daily closing bid/ask midpoint, **not the election result**. An earlier 30-day validation period selects the displayed method, including a no-change baseline. Error is walk-forward mean absolute error in percentage points; lower is better.

| Contract | Selected method | Forecast | Forecast for (UTC) | Test MAE | No-change MAE | Test days |
| :-- | :-- | --: | :-- | --: | --: | --: |
| house / democratic | No change | 89.5% | 2026-10-09T04:00:00Z | 0.28 | 0.28 | 60 |
| house / republican | No change | 10.5% | 2026-10-09T04:00:00Z | 0.30 | 0.30 | 60 |
| senate / democratic | No change | 62.5% | 2026-10-09T04:00:00Z | 0.65 | 0.65 | 60 |
| senate / republican | No change | 38.5% | 2026-10-09T04:00:00Z | 0.67 | 0.67 | 60 |

Model trained: 2026-10-08T07:26:50Z. Forecasts expire at their target time. Uses Kalshi history only; no polling or election-outcome training. See the dashboard and model card for limitations.

<!-- CONGRESS_ODDS:END -->

## Sources and market average

- **Polymarket:** direct House and Senate Yes outcome prices from the Gamma API.
- **Kalshi:** direct House and Senate Yes bid/ask midpoints, using CONTROLH-2026 and CONTROLS-2026.
- **PredictIt:** Senate control market 8155, using Yes bid/ask midpoints. No direct House contract is configured; combined Congress scenarios are not silently converted into House probabilities.
- **Market average:** equal weight per eligible source, calculated separately for each party. A descriptive mean, not a learned or calibrated election forecast. Only open sources retrieved within two hours are eligible. Quotes may still be older than retrieval time.

Party prices are independent, are not normalized, and may not sum to 100%. Markets differ in fees, liquidity, settlement rules and handling of ties. They reflect related information and are not independent evidence. These are not vote shares, seat counts or official results.

Sources: [Polymarket API](https://docs.polymarket.com/api-reference/events/get-event-by-slug), [Kalshi API](https://docs.kalshi.com/api-reference/market/get-market-candlesticks), [PredictIt Senate API](https://www.predictit.org/api/marketdata/markets/8155).

## Machine learning

Three model families—**ridge regression, random forest and gradient boosting**—plus their equal-weight ensemble forecast the **next daily closing Kalshi Yes bid/ask midpoint** for each party and chamber. Five inputs capture current price, momentum and volatility. These are market-price models, not trained election-outcome probabilities.

A 30-day expanding-window validation period selects a candidate by MAE, including the no-change baseline. A separate later 60-day expanding-window test reports MAE, RMSE and directional hit rate without reselecting on test performance. The selected method can be no-change. Models use only observations available at each forecast origin.

The interactive forecast lab includes a test-error ranking, model/contract selectors, predicted-versus-actual charts with detail/full scales, and random-forest feature importance. Market pulse cards show 7-day Democratic price changes and cross-source spreads. Optional UI sounds are off by default and play only for user interactions. See [MODEL_CARD.md](MODEL_CARD.md) for assumptions and [downloadable backtests](dist/data/model.json).

## Interactive race map and what-if simulator

Explore all 35 Senate contests (including Florida and Ohio specials) and 435 House districts on a geographic U.S. map with clickable states and Alaska/Hawaii insets. Assign Democratic-aligned, Republican-aligned or other outcomes and watch seat totals update. Includes Senate holdovers, a configurable VP tie-break, an optional current Senate seat-party preset, local saving and JSON import/export.

These are **user-built scenarios, not forecasts or election results**. House choices start unassigned. The static race manifest was verified on 2026-10-05 and is separate from hourly market updates. See [scenario rules and sources](SCENARIOS.md).

## Automatic updates

- GitHub Actions runs hourly at minute 17, retrieves all five source/chamber pairs, updates data and this README's marked section, commits changes and deploys GitHub Pages. GitHub schedules may be delayed or disabled in inactive repositories.
- Source failures retain the previous snapshot **and its original retrieval timestamp**. A stale snapshot is visibly labeled and excluded from the market average. If every source fails, the retrieval step reports a warning and retains the validated previous snapshots; the site can still publish code fixes and marks old quotes stale.
- Daily ML training runs after the previous forecast horizon expires. Training failure preserves the older model with its original dates; the website labels expired forecasts. The workflow reports a warning but still publishes fresh source prices.
- The open website reloads saved snapshots and refreshes Polymarket directly every five minutes. Kalshi and PredictIt are refreshed by Actions, avoiding dependence on browser cross-origin permissions.
- No keys or credentials are shipped to the browser. GitHub Pages uses the GitHub Actions source in repository settings.

Retrieval time is not a trade timestamp. Polymarket's record-update timestamp is preserved in JSON. Kalshi's market metadata time is not used as a quote time; PredictIt's timezone-unspecified timestamp is retained verbatim, not interpreted as UTC.

## Reliability and recovery

- Every browser request has a deadline, including JSON parsing. Temporary network/server failures retry with bounded backoff; invalid JSON and permanent HTTP errors do not repeatedly retry.
- Market, model and history payloads are validated before replacing displayed data. Older snapshots cannot overwrite newer quotes. Probabilities, source links, timestamps, chart order and model chronology are checked.
- Last valid snapshots are cached on the device when browser storage is available, preserving their original dates. Cached stale quotes never become eligible merely because they were reloaded. This is data recovery, not a guarantee that the whole website can open offline.
- A visible data-status line reports source availability and refresh failures. Refresh controls recover after a failure. Hidden tabs pause polling and refresh when active again; reconnection triggers a refresh.
- Scenario edits, bulk assignments, resets and imports support 50 undo/redo steps per page session. Choices still persist between visits. Copyable JSON provides a fallback when downloads are blocked; invalid imports preserve current choices.
- Pull requests run parser, reliability, scenario and model-chronology tests. Deployment also validates snapshots and local asset references. Failed source retrieval or model-dependency installation retains validated prior data; malformed artifacts stop publication.
- Refresh jobs have time limits and skip publication if the default branch advances while they run, avoiding an older snapshot of the code replacing a newer change. No force pushes are used.

## Local use

Requires Node.js 22+ and Python 3.11+:

```sh
pip install -r scripts/requirements.txt
node --test scripts/*.test.mjs
python scripts/test_model.py
node scripts/validate-build.mjs
node scripts/update-data.mjs
python scripts/train-model.py
node scripts/update-readme.mjs
python scripts/package-source.py
python -m http.server 8000 --directory dist
```

The README marker pair must occur exactly once. `dist/` is the complete static website. The source download is built during deployment and is not committed. The workflow updates this repository's README, not another profile README or the repository About description.
