# Visitor statistics

The homepage footer keeps its existing Busuanzi page-view count and links to `/visitors/`.
GoatCounter separately collects geographic visit totals for the production origin only.
Local previews are excluded. No private API credentials are sent to the browser.

- Account: `planepig.goatcounter.com`
- Tracking started: 2026-10-19
- Account data retention: 0 (never delete)
- Public data: country and province/state names, aggregate visit totals, and representative centres
- No individual pageviews, referrers, device details or full IP addresses are published

## Refresh

The live read-only API is independent of GitHub Pages builds:
`https://junyi-visitor-statistics.planepig.chatgpt.site/visitor-stats.json`.
It reads GoatCounter using the existing **Read statistics** credential restricted
to the `planepig` site. Credentials and storage bindings never reach the browser.

Requests refresh the aggregate snapshot when it is older than 15 minutes. A
persistent R2 lease prevents overlapping refreshes and backs off upstream errors.
The last successful snapshot survives Worker restarts and is retained on errors;
an unsuccessful request never advances its `updatedAt`. `stale: true` identifies
a failed or deferred refresh. No scheduler, open authoring session, or site
redeployment is needed. This is demand-driven refresh, not unattended cron work:
after a quiet period, the next API request refreshes before returning.

The map requests the live endpoint on opening, once a minute while visible, and
when the tab becomes visible or connectivity returns. It validates incoming data,
keeps the newest successful snapshot in optional browser storage, and shows a
delay notice on errors or when data exceeds 30 minutes. Timestamps use the
visitor's local timezone. The footer's Busuanzi counter remains independent.

GitHub Actions now only builds and publishes content on pushes or manual dispatch;
its unreliable scheduled trigger is removed. The checked-in snapshots remain a
fallback for initial rendering and offline use, not the live data source. Do not
judge live API freshness from the legacy `/visitor-stats.json` static download.

`scripts/sync-visitors.mjs` requests the complete date range since tracking started,
including every result page, and produces `src/data/visitors.json` plus the public
`/visitor-stats.json` download. A failed API request preserves the local snapshot.
This script remains available for explicitly refreshing the
fallback; it is no longer part of content deployment. Local builds use the saved
fallback and client-side statistics use the independent API.

Geographic totals count visits using GoatCounter's session rules; they need not
match Busuanzi page views. Older Busuanzi views cannot be assigned locations.
Country centres come from mledoze/countries under ODbL; attribution and aggregate
data are linked on the visitor page. Globe rendering uses COBE (MIT).

The official tracker is served locally as `/vendor/goatcounter.js` to avoid a
separate CDN dependency. Source: https://github.com/arp242/goatcounter/blob/main/public/count.js
(retrieved 2026-10-19, ISC license). Self-hosting is supported by GoatCounter:
https://www.goatcounter.com/help/countjs-host . Keep the upstream license header.
The local copy omits screen size and raw URL query strings from tracking payloads.

## Province/state detail

The sync requests every page of `/stats/locations/{country}` as well as country
totals. Nested counts are not added a second time to the global total. Missing
province/state information remains `Unspecified region`. Country totals are
reconciled if new visits arrive while the regional requests are running.

China is plotted by province when a matching province is available; unidentified
regions use the country marker. Other countries retain country-level map markers
with province/state counts in the list. `src/data/china-provinces.json` contains
representative administrative centroids from DataV GeoAtlas, with the source URL
in the file. They are not visitor coordinates or evidence of a particular city.

`Unspecified region` entries remain in the aggregate data for count reconciliation
but are hidden in the display; their visits stay in the parent country/region.

## Service source

The independently managed Sites checkout is `services/visitor-api/` (ignored by
the homepage's Git repository). Its hosting manifest owns project
`appgprj_6ad6e7b9738881919c55bc9d3ff83f40`; never create another Site for updates.
Build and publish through the Sites skill. `src/lib/visitor-data.mjs` and the
service's `worker/location-data.mjs` share the same aggregation implementation;
update both together when geographic normalization changes.
