# Visitor statistics worker

GoatCounter remains the collector and the source of historical aggregates.
Cloudflare's native five-minute cron refreshes a Workers KV snapshot. Public
GET requests read that snapshot and never initiate a GoatCounter request.
Only aggregate counts and approximate country/region locations are returned.

`seed.json` preserves the complete snapshot before migration. Each successful
sync keeps the previous snapshot under `previous-snapshot`; failed, invalid,
or regressing results cannot replace history. Failure logs contain fixed
categories, never credentials or raw upstream response bodies.

The snapshot and its short CDN cache supply both the footer and globe. The
site additionally bundles the latest migration snapshot and keeps a validated
browser cache, so reading statistics never hides the navigation or clears data.

## Deployment

Use the account owner's authenticated Wrangler session. Bind the dedicated KV
namespace as `STATS`, seed its `snapshot` key with `seed.json`, and put the
site-scoped read-only key into the `GOATCOUNTER_API_TOKEN` Worker Secret through
Wrangler's hidden stdin prompt. Never place that credential in source, command
arguments, logs, or browser code. The Worker accepts no public writes or setup
requests. `wrangler.jsonc` declares the native five-minute schedule.

Before switching the frontend, verify a successful real scheduled invocation,
its persisted `sync-status`, the new snapshot timestamp, HTTP cache headers,
and the absence of upstream requests from the public read path. Retain the
previous service for rollback until the new path is verified.

Run `npm test` here and the main website build before deployment. The copied
geographic centres use the same mledoze/countries and DataV GeoAtlas sources
attributed on the existing visitor page.
