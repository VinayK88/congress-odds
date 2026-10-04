# Congress Odds experimental model

## Intended use and target

Explore short-term market-price dynamics, separately from current election-control prices. This is **not an election-outcome forecasting model** and its outputs are not calibrated probabilities of a party winning. It predicts the next completed daily Kalshi Yes bid/ask midpoint for four contracts: CONTROLH-2026-D/R and CONTROLS-2026-D/R. Each contract has its own model. No other exchange, polling, demographic or election-result data enters training.

## Data

Public Kalshi daily candlesticks (`period_interval=1440`) over the preceding 365 days. Closing best Yes bid and ask are averaged. Null, crossed, boundary (0/1) and incomplete/future candles are excluded. Timestamps are deduplicated and sorted. Examples require eight days of contiguous features plus the following target day; daily gaps of 23–25 hours allow exchange daylight saving changes. Larger gaps are excluded rather than imputed. At least 150 valid training examples are required. History must end within 36 hours of retrieval.

The source gives exchange-defined daily boundaries. The displayed forecast timestamp is the last completed boundary plus 24 hours, which can differ by one hour when the next boundary changes for daylight saving time. Published history contains the exact timestamps and midpoint prices used. Historical quotes may be illiquid; market microstructure and revisions can affect results.

## Algorithm

For each contract, inputs at day t are:

1. Current midpoint.
2. Change since t−1.
3. Change since t−3.
4. Change since t−7.
5. Population standard deviation of the seven daily changes ending at t.

All models predict the next daily price change, added to the latest observed midpoint and clipped to [0,1]. Fixed hyperparameters:

| Candidate | Configuration |
| --- | --- |
| Ridge | StandardScaler fitted on training rows + Ridge, alpha 10 |
| Random forest | 64 trees, max depth 4, min leaf size 8, seed 42 |
| Gradient boosting | 60 trees, depth 2, learning rate 0.03, min leaf size 8, seed 42 |
| ML ensemble | Equal average of the three clipped price forecasts |
| No change | Previous daily midpoint |

Every contract has its own fits. Party forecasts are independent and not normalized. Final forecasts are refit on all available labeled history after evaluation.

## Selection and evaluation

Thirty expanding-window validation observations immediately precede the sixty test observations. The candidate with the lowest validation MAE is selected; exact ties prefer no-change. Selection is frozen for the test window. At each validation or test origin, all estimators and scalers are refit using only labels observed at that origin. Earlier test labels may be used for later forecasts, as in daily operation, without reselecting the candidate. The minimum initial fit uses 60 examples.

The subsequent 60-day test reports mean absolute error and root mean squared error × 100 in percentage points. Directional hit rate measures the sign of the forecast change against the actual change on non-flat days only (actual change magnitude > 1e-8). A no-change prediction is a miss on those moving days; no eligible days produces null. This is not election accuracy.

The leaderboard sorts test MAE for inspection but never uses that rank to change the selected method. Per-day predictions, actuals, baseline, training counts, validation score and date boundaries are saved for every candidate. Backtest days can be non-contiguous when inputs are missing. No random split, test-based hyperparameter tuning or calibrated uncertainty interval is used.

Displayed forest feature importance is normalized impurity reduction from the latest forest fit. It is model-specific, can be biased and shared among correlated inputs, and does not establish causal drivers. If no splits occur all importances are zero. It is not an out-of-sample explanation or the importance of the selected model when another method is chosen.

Detail charts use a clearly labeled zoomed probability axis with an optional full 0–100% scale. Market pulse sparklines use local scales; source-spread meters use full 0–100% scales. No uncertainty band or probability calibration is implied. Repeated inspection of backtests is not a substitute for a locked prospective evaluation.

## Refresh and limits

Hourly automation trains again only after the forecast target has passed. Until then, the same daily forecast is served. Training failures preserve the last complete model and data, with original times; expired forecasts are labeled on the dashboard. The model is shown separately from the descriptive market average and does not override observed source quotes.

A no-change baseline can outperform the fitted model; this is displayed prominently. Results from one election cycle and one platform do not establish general predictive skill. The latest intraday quotes may differ from the latest completed daily candle, so compare the forecast to its displayed last close. No investment recommendation is implied.

Reproduce with `python scripts/train-model.py`; pinned dependencies are in `scripts/requirements.txt`. Source: [Kalshi candlestick documentation](https://docs.kalshi.com/api-reference/market/get-market-candlesticks).
