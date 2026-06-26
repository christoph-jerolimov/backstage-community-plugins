---
'@backstage-community/plugin-codecov': minor
'@backstage-community/plugin-codecov-backend': minor
---

Introduce the Codecov plugin. The frontend plugin adds an `EntityCodecovCard`
catalog card that shows common code coverage information (overall line coverage,
lines, files, hits, misses, partials and branch coverage) for entities annotated
with `codecov.io/repo`. The backend plugin acts as an authenticated proxy in
front of the Codecov API, injecting the API token configured under `codecov` in
the app config.
