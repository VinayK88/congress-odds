# Congress Odds

**[Open the live dashboard](https://vinayk88.github.io/congress-odds/)** · [Automatic updates](https://github.com/VinayK88/congress-odds/actions) · [Model card](MODEL_CARD.md)

Compare Democratic and Republican chances of controlling the 2026 U.S. House and Senate across **Polymarket, Kalshi, PredictIt and Manifold**. Includes an equal-weight cash-market average (Manifold is comparison only), daily history chart and experimental machine learning forecasts.

**Adaptive updates (U.S. Eastern dates):** hourly through Oct 19; every 30 minutes Oct 20–26; every 15 minutes Oct 27–31; every 5 minutes Nov 1–3. Candidate profiles are refreshed at most every 15 minutes in the final phase, and the experimental Kalshi-price model retrains only when its daily target expires. Scheduled GitHub Actions are best-effort, not guaranteed real-time quotes; each displayed price retains its retrieval timestamp. After Election Day, refreshes slow down.

<!-- CONGRESS_ODDS:START -->
## 2026 U.S. Congress control probabilities

| Chamber | Source | Democrats | Republicans | Retrieved (UTC) |
| :-- | :-- | --: | --: | :-- |
| House | [Polymarket](https://polymarket.com/event/which-party-will-win-the-house-in-2026) | 91.5% | 8.5% | 2026-10-27T19:28:46.166Z |
| House | [Kalshi](https://kalshi.com/markets/controlh/house-winner/controlh-2026) | 90.8% | 9.3% | 2026-10-27T19:28:46.218Z |
| House | [PredictIt](https://www.predictit.org/markets/detail/8157) | 90.5% | 11.5% | 2026-10-27T19:28:46.465Z |
| House | [Manifold · play money (comparison only)](https://manifold.markets/HillaryClinton/will-the-democrats-win-a-majority-i-ClQ6g6lntn) | [94.3%](https://manifold.markets/HillaryClinton/will-the-democrats-win-a-majority-i-ClQ6g6lntn) | [5.9%](https://manifold.markets/ryanmccomb/republicans-have-house-majority-aft) | 2026-10-27T19:28:46.422Z |
| Senate | [Polymarket](https://polymarket.com/event/which-party-will-win-the-senate-in-2026) | 65.5% | 34.5% | 2026-10-27T19:28:46.168Z |
| Senate | [Kalshi](https://kalshi.com/markets/controls/senate-winner/controls-2026) | 64.5% | 36.5% | 2026-10-27T19:28:46.232Z |
| Senate | [PredictIt](https://www.predictit.org/markets/detail/8155) | 66.5% | 38.0% | 2026-10-27T19:28:46.502Z |
| Senate | [Manifold · play money (comparison only)](https://manifold.markets/BoltonBailey/will-democrats-lose-control-of-the) | [66.8%](https://manifold.markets/BoltonBailey/will-democrats-lose-control-of-the) | [30.5%](https://manifold.markets/AndrewG/will-republicans-win-the-senate-in-738388924521) | 2026-10-27T19:28:46.511Z |

Polymarket: Yes outcome prices. Kalshi and PredictIt: Yes bid/ask midpoints. PredictIt covers House and Senate. Manifold shows separate play-money Yes contracts for each party and is excluded from the cash-market average. Prices are independent and may not total 100%. Market rules differ; these are not vote shares or guaranteed results.

### Experimental machine learning — next daily Kalshi price

Ridge, random forest, gradient boosting and their ensemble forecast the next daily closing bid/ask midpoint, **not the election result**. An earlier 30-day validation period selects the displayed method, including a no-change baseline. Error is walk-forward mean absolute error in percentage points; lower is better.

| Contract | Selected method | Forecast | Forecast for (UTC) | Test MAE | No-change MAE | Test days |
| :-- | :-- | --: | :-- | --: | --: | --: |
| house / democratic | No change | 90.1% | 2026-10-21T04:00:00Z (expired) | 0.30 | 0.30 | 60 |
| house / republican | No change | 10.0% | 2026-10-21T04:00:00Z (expired) | 0.33 | 0.33 | 60 |
| senate / democratic | No change | 62.5% | 2026-10-21T04:00:00Z (expired) | 0.60 | 0.60 | 60 |
| senate / republican | No change | 37.5% | 2026-10-21T04:00:00Z (expired) | 0.67 | 0.67 | 60 |

Model trained: 2026-10-20T12:03:29Z. Forecasts expire at their target time. Uses Kalshi history only; no polling or election-outcome training. See the dashboard and model card for limitations.

<!-- CONGRESS_ODDS:END -->

## Sources and market average

- **Polymarket:** direct House and Senate Yes outcome prices from the Gamma API.
- **Kalshi:** direct House and Senate Yes bid/ask midpoints, using CONTROLH-2026 and CONTROLS-2026.
- **PredictIt:** direct House market 8157 and Senate market 8155, using Yes bid/ask midpoints. Failed or invalid quotes retain their original timestamps.
- **Manifold:** independent House and Senate Yes contracts for each party, using the public API. Play-money community markets are labeled and excluded from the cash-market average and ML training. No complementary party probabilities are invented; separate contracts may not sum to 100%.
- **Market average:** equal weight per eligible cash-market source (Polymarket, Kalshi and PredictIt), calculated separately for each party. A descriptive mean, not a learned or calibrated election forecast. Only open sources retrieved within two hours are eligible. Quotes may still be older than retrieval time.

Party prices are independent, are not normalized, and may not sum to 100%. Markets differ in fees, liquidity, settlement rules and handling of ties. They reflect related information and are not independent evidence. These are not vote shares, seat counts or official results.

Sources: [Polymarket API](https://docs.polymarket.com/api-reference/events/get-event-by-slug), [Kalshi API](https://docs.kalshi.com/api-reference/market/get-market-candlesticks), [PredictIt Senate API](https://www.predictit.org/api/marketdata/markets/8155), [PredictIt House API](https://www.predictit.org/api/marketdata/markets/8157), [Manifold API](https://docs.manifold.markets/api).

## Machine learning

Three model families—**ridge regression, random forest and gradient boosting**—plus their equal-weight ensemble forecast the **next daily closing Kalshi Yes bid/ask midpoint** for each party and chamber. Five inputs capture current price, momentum and volatility. These are market-price models, not trained election-outcome probabilities.

A 30-day expanding-window validation period selects a candidate by MAE, including the no-change baseline. A separate later 60-day expanding-window test reports MAE, RMSE and directional hit rate without reselecting on test performance. The selected method can be no-change. Models use only observations available at each forecast origin.

The interactive forecast lab includes a test-error ranking, model/contract selectors, predicted-versus-actual charts with detail/full scales, and random-forest feature importance. Market pulse cards show 7-day Democratic price changes and cross-source spreads. Optional UI sounds are off by default and play only for user interactions. See [MODEL_CARD.md](MODEL_CARD.md) for assumptions and [downloadable backtests](dist/data/model.json).

## Interactive race map and what-if simulator

Explore all 35 Senate contests (including Florida and Ohio specials) and 435 House districts on a geographic U.S. map with clickable states and Alaska/Hawaii insets. Assign Democratic-aligned, Republican-aligned or other outcomes and watch seat totals update. Includes Senate holdovers, a configurable VP tie-break, an optional current Senate seat-party preset, local saving and JSON import/export.

These are **user-built scenarios, not forecasts or election results**. House choices start unassigned. The static race manifest was verified on 2026-10-05 and is separate from scheduled market updates. See [scenario rules and sources](SCENARIOS.md).

## Candidate names, photos and race odds

[Explore candidate profiles](https://vinayk88.github.io/congress-odds/#candidates). Filter Senate and House profiles by state, search candidate names or districts, and see source-backed portraits and Yes outcome prices. Choosing a state or House district on the map shows its profiles beside the scenario editor.

The adaptive workflow discovers 2026 general-election race markets through Polymarket's Senate/House tags. Direct individual-candidate contracts take priority over party contracts for the same race. Party/nominee contracts are labeled because they may follow a replacement nominee. Profiles are market listings, not a certified ballot roster; unnamed outcomes and missing photos are explicit. Closed markets do not display a current probability, and snapshots older than two hours are marked stale.

Images come from Polymarket or public-domain congressional portraits in [unitedstates/images](https://github.com/unitedstates/images), matched by full name and state using [congress-legislators](https://github.com/unitedstates/congress-legislators). Failed images fall back to initials. [Download timestamped candidate data](dist/data/candidates.json).

## Automatic updates

- GitHub Actions checks a five-minute trigger grid but skips refresh slots until due: hourly through Oct 19, 30 minutes Oct 20–26, 15 minutes Oct 27–31, and five minutes Nov 1–3 (U.S. Eastern dates). Due runs retrieve five configured source/chamber pairs, update this README, commit results, and deploy GitHub Pages. GitHub schedules may be delayed or disabled in inactive repositories.
- Source failures retain the previous snapshot **and its original retrieval timestamp**. A stale snapshot is visibly labeled and excluded from the market average. If every source fails, the retrieval step reports a warning and retains the validated previous snapshots; the site can still publish code fixes and marks old quotes stale.
- Daily ML training runs after the previous forecast horizon expires. Training failure preserves the older model with its original dates; the website labels expired forecasts. The workflow reports a warning but still publishes fresh source prices.
- The open website reloads saved snapshots and refreshes Polymarket directly every 5 minutes initially, increasing to every 3 minutes from Oct 20, every 2 minutes from Oct 27, and every minute Nov 1–3. Kalshi and PredictIt are refreshed by Actions, avoiding dependence on browser cross-origin permissions.
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

## Current-probability map

The race explorer opens in **Market odds** mode and uses the scheduled Polymarket race snapshots also shown in candidate profiles. Senate states show the leading eligible contract, with four probability shades (under 60%, 60–79.9%, 80–94.9%, and 95%+). House state bands count district market leaders; they are not statewide probabilities, projected winners, or a chamber-control forecast. Click a state, then a House district, to inspect candidate names, available portraits, odds, and settlement rules.

Ties, unknown leading parties, incomplete quotes and snapshots older than two hours are neutral. States without a Senate contest are pale and dashed. The page checks for new snapshots at an adaptive interval and reevaluates freshness every minute while visible. **Your scenario** preserves saved manual choices separately; source odds never overwrite them. Race markets may be party/nominee contracts that follow replacement nominees. The map does not blend chamber-wide Kalshi or PredictIt prices into individual race probabilities.

The map's party totals update with these same race leaders. Senate totals add 34 Democratic-aligned and 31 Republican holdovers to the 35 contested races; House totals count all 435 districts. Other and unclear races remain separate. The bar marks the numerical majority threshold. These are leader tallies, not probability-weighted expected seats or a chamber-control forecast.

## Early voting

[Explore the early-voting tracker](https://vinayk88.github.io/congress-odds/#early-voting). Source: [UF Election Lab / Michael McDonald](https://election.lab.ufl.edu/early-vote/2026-early-voting/), [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). Counts show ballot activity, not candidate votes, election results or probabilities. This feed is excluded from the market average and ML training.

<!-- EARLY_VOTE:START -->

| Reported ballot activity | Count | Jurisdictions with this field |
| :-- | --: | --: |
| Early ballots | 34,403,406 | 49 |
| In-person early | 17,761,348 | 49 |
| Mail accepted | 16,642,058 | 49 |
| Mail requested / issued | 59,838,980 | 49 |

Feed retrieved: 2026-10-27T19:28:51.116Z. Partial coverage: 49 of 51 jurisdictions (50 states + D.C.); report dates vary.

<!-- EARLY_VOTE:END -->

The existing refresh workflow retrieves the public UF CSV. Missing values are not zero-filled; original report dates and source notes remain visible. Failed retrievals retain the last validated snapshot with its original timestamp. Totals cover available jurisdictions with different reporting dates, including older reports; they are not complete national turnout. Requested/issued mail ballots are not added to ballots cast. Source-reported zeros may be pre-voting placeholders.
