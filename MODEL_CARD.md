# Congress Odds experimental model

## Intended use and target

Explore short-term market-price dynamics, separately from current election-control prices. This is **not an election-outcome forecasting model** and its outputs are not calibrated probabilities of a party winning. It predicts the next completed daily Kalshi Yes bid/ask midpoint for four contracts: CONTROLH-2026-D/R and CONTROLS-2026-D/R. Each contract has its own model. No other exchange, polling, demographic or election-result data enters training.

## Data

Public Kalshi daily candlesticks (`period_interval=1440`) over the preceding 365 days. Closing best Yes bid and ask are averaged. Null, crossed, boundary (0/1) and incomplete/future candles are excluded. Timestamps are deduplicated and sorted. Examples require eight days of contiguous features plus the following target day; daily gaps of 23–25 hours allow exchange daylight saving changes. Larger gaps are excluded rather than imputed. At least 120 valid training examples are required. History must end within 36 hours of retrieval.

The source gives exchange-defined daily boundaries. The displayed forecast timestamp is the last completed boundary plus 24 hours, which can differ by one hour when the next boundary changes for daylight saving time. Published history contains the exact timestamps and midpoint prices used. Historical quotes may be illiquid; market microstructure and revisions can affect results.

## Algorithm

For each contract, inputs at day t are:

1. Current midpoint.
2. Change since t−1.
3. Change since t−3.
4. Change since t−7.
5. Population standard deviation of the seven daily changes ending at t.

`StandardScaler` and `Ridge(alpha=10.0)` fit the next-day price change. The predicted change is added to the current midpoint and clipped to [0,1]. Alpha is fixed, with no tuning against the displayed holdout. Each forecast is trained on all valid historical labeled examples available through its origin. Party forecasts are independent and not normalized. Saved model JSON includes coefficients, scaler parameters, intercept and feature names for inspection.

## Evaluation

Expanding-window, one-day-ahead validation over the last 60 valid examples (at least 60 earlier training examples). Each scaler and model is refit using only labels already observed at the test forecast origin. No random train/test split. The no-change baseline predicts the previous daily midpoint. The reported metric is mean absolute error × 100, in percentage points. Per-day actuals, predictions, baseline and training counts are saved in model JSON.

Backtest days may not be contiguous if data is missing. The final model uses the evaluation period as training data only after those outcomes have occurred, to make a later forecast. The historical holdout measures short-term price error, not accuracy of election probabilities. There are no election-outcome labels, reliability diagrams, calibrated confidence intervals or claims of causal explanation. Repeated inspection of these results is not a substitute for a locked prospective evaluation.

## Refresh and limits

Hourly automation trains again only after the forecast target has passed. Until then, the same daily forecast is served. Training failures preserve the last complete model and data, with original times; expired forecasts are labeled on the dashboard. The model is shown separately from the descriptive market average and does not override observed source quotes.

A no-change baseline can outperform the fitted model; this is displayed prominently. Results from one election cycle and one platform do not establish general predictive skill. The latest intraday quotes may differ from the latest completed daily candle, so compare the forecast to its displayed last close. No investment recommendation is implied.

Reproduce with `python scripts/train-model.py`; pinned dependencies are in `scripts/requirements.txt`. Source: [Kalshi candlestick documentation](https://docs.kalshi.com/api-reference/market/get-market-candlesticks).
