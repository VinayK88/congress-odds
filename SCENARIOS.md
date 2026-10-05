# 2026 seat scenario simulator

The interactive geographic state map and House district selector are a deterministic **what-if tool**. They do not produce probabilities, race ratings, polling estimates or election results. User choices never change the market dashboard or train the market-price models.

## Manifest and sources

Verified **2026-10-05**, stored in `dist/race-data.mjs`:

- [Official Senate Class II roster](https://www.senate.gov/senators/Class_II.htm): 33 regular contests.
- [2026 Senate election coverage](https://www.270towin.com/2026-senate-election/): Florida and Ohio special elections bring the total to 35. [Ohio official writ](https://www.ohiosos.gov/assets/directive-2025-54-writ-of-special-election-for-united-states-senate-election.pdf) specifies its unexpired term.
- [Official Senate XML roster](https://www.senate.gov/general/contact_information/senators_cfm.xml): 53 Republicans, 45 Democrats and two independents at verification. Removing the 35 contested seats (22 R, 13 D) leaves 31 R, 32 D and two independents. The tool assumes both holdover independents align with Democrats, giving a fixed 34 D-aligned / 31 R baseline.
- [Census apportionment map](https://www2.census.gov/programs-surveys/decennial/2020/data/apportionment/apportionment-2020-map01.pdf): all 435 voting House seats across 50 states. At-large districts use the suffix `AL`; numbered districts use `01`, `02`, etc. Non-voting delegates are excluded.
- [Senate VP tie votes](https://www.senate.gov/legislative/TieVotes.htm): the VP breaks Senate ties. The default assumes a Republican VP; users can change this or disable the tie-break assumption.

The manifest is a manually verified snapshot. The hourly market workflow does **not** update race lists, holdover parties, district boundaries or caucus assumptions. Review it when vacancies or special elections change the seat roster. Map paths use Census 2017 state boundaries redistributed as us-atlas 3.0.1 under the ISC license (see `dist/us-atlas-LICENSE.txt`). The Albers USA projection places Alaska and Hawaii in insets and scales Alaska down. State borders are geographic; House district boundaries are not drawn. Selecting a state opens its district-number controls. House map colors show the fraction of assigned seats in each bloc, not geographic district locations or vote shares. The geometry is bundled locally, so no map API key or third-party runtime request is needed. Rebuild it with `scripts/build-state-map.mjs` using the pinned topology URL in that script.

## Counting rules

All contested races initially show **Unassigned**. The Senate's optional current seat-party preset assigns 13 contested seats D and 22 R, for a 47 D-aligned / 53 R whole-chamber scenario. This preset is not a candidate list or forecast. House seats have no incumbent-party preset.

Assignments are Democratic-aligned, Republican-aligned, Other/unaffiliated or Unassigned. Independents may be assigned to an expected caucus as an explicit user assumption. Other winners never automatically enter a coalition.

The display calls an outright numerical majority at 51 of 100 Senate seats or 218 of 435 House seats, including when that threshold is already reached with other races unassigned. For a fully assigned 50 D / 50 R Senate, the selected VP party receives the tie-break indication. Other combinations without an outright majority remain unresolved. These rules do not simulate vacancies, membership changes, Speaker elections, coalition agreements or procedural votes.

## Persistence and portability

Choices for both chambers and the VP assumption save in the browser's local storage under `congress-odds-scenario-v1`. Download and import JSON to move a scenario between devices. Imports require schema version 1, known race IDs and allowed party values; invalid files leave the current scenario unchanged. Clear choices resets only the selected chamber. Undo/redo recovers up to 50 edits, imports, presets or clears within the current page session; undo history is not persisted across reloads. A copyable JSON field is available if a browser blocks downloads. A warning appears when another tab saves a different scenario; it does not silently overwrite the current view. Device data and scenario files are not uploaded or included in the hourly README.

Run `node --test scripts/*.test.mjs` to verify manifest uniqueness, seat conservation, majority thresholds, VP ties and import validation.
