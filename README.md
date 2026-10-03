# Congress Odds

A responsive 2026 U.S. House and Senate control dashboard showing Democratic and Republican market-implied chances from Polymarket.

<!-- CONGRESS_ODDS:START -->
## 2026 U.S. Congress control probabilities

| Chamber | Democrats | Republicans | Retrieved (UTC) |
| :-- | --: | --: | :-- |
| [House](https://polymarket.com/event/which-party-will-win-the-house-in-2026) | 93.5% | 6.5% | 2026-10-03 22:24:08 |
| [Senate](https://polymarket.com/event/which-party-will-win-the-senate-in-2026) | 64.5% | 35.5% | 2026-10-03 22:24:08 |

Source: Polymarket market-implied probabilities, not polling percentages or guaranteed outcomes. Independent market prices are shown without normalization and may not total 100%. Check the retrieval dates above; scheduled updates may be delayed.
<!-- CONGRESS_ODDS:END -->

## Automatic updates

- The website reads its saved snapshot, then requests each chamber's current market data on load and every five minutes. Each chamber refreshes independently; failed requests retain the previous data and show a notice.
- `.github/workflows/refresh.yml` retrieves both chambers hourly at minute 17, updates `dist/data/latest.json` and **only this README's marked section**, commits changes, and deploys `dist` to GitHub Pages. GitHub can delay scheduled runs or disable schedules in inactive public repositories.
- Invalid or incomplete source responses fail the updater without writing new data. Data older than two hours is visibly marked as stale; closed markets are labeled closed, not declared official results.
- No API key is required. No credentials are shipped to the browser.

## Connect to GitHub

1. Put these files at the root of the chosen repository on its default branch. Preserve the workflow under `.github/workflows/refresh.yml`.
2. In repository Settings → Pages, choose **GitHub Actions** as the build source.
3. Allow GitHub Actions to write repository contents, subject to branch protection. Run **Refresh Congress odds** once in the Actions tab. The scheduled trigger runs on the default branch.
4. The workflow publishes the site and updates this repository's README. If adding to an existing README, preserve exactly one `CONGRESS_ODDS:START` / `CONGRESS_ODDS:END` marker pair.

This does not change the separate GitHub repository “About” description or another repository's profile README. Those require a separately selected target.

## Local use

Requires Node.js 22+ and Python 3. From the repository root:

```sh
node scripts/update-data.mjs
python -m http.server 8000 --directory dist
```

## Methodology

Each chamber uses its own Polymarket event. For each party, we identify the explicitly named party market and read its **Yes** outcome price from the Gamma API, multiplied by 100. Values are not normalized; independently quoted prices can sum to slightly more or less than 100%. These are market estimates of chamber control, not vote shares, seat forecasts, an official result, or a polling-based statistical model. Market rules determine treatment of ties and party affiliations; consult the source links in the table.

The dashboard exposes both retrieval time and the API's market `updatedAt` field. The latter describes record updates and is not necessarily the time of the last trade. It never presents an old snapshot as a new successful fetch.

Sources: [API documentation](https://docs.polymarket.com/api-reference/events/get-event-by-slug), [House market](https://polymarket.com/event/which-party-will-win-the-house-in-2026), [Senate market](https://polymarket.com/event/which-party-will-win-the-senate-in-2026).
