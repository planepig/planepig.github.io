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

GitHub Actions reads the `GOATCOUNTER_API_TOKEN` repository secret. Give this token
only **Read statistics**, restricted to the `planepig` site. Run the deployment
workflow manually to refresh immediately. Scheduled runs refresh approximately
hourly; GitHub may delay them and disables scheduled workflows in public
repositories after 60 days without repository activity. Re-enable the workflow if
that happens. Geographic tracking and the retained GoatCounter history continue
independently of snapshot refreshes.

`scripts/sync-visitors.mjs` requests the complete date range since tracking started,
including every result page, and produces `src/data/visitors.json` plus the public
`/visitor-stats.json` download. A failed API request stops deployment, preserving
the last published snapshot. Running `npm run build` locally uses the saved snapshot.

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
