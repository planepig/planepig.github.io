import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import countries from 'world-countries';

export const SINCE = '2026-10-19';
const countryByCode = new Map(countries.map(country => [country.cca2, country]));

// Read every page; the API otherwise returns only the top 20 locations.
export async function loadLocations(request, now = new Date()) {
  const params = new URLSearchParams({
    start: `${SINCE}T00:00:00Z`,
    end: now.toISOString(),
    limit: '100',
  });
  const seen = new Set();
  const locations = [];
  for (let offset = 0; ; ) {
    params.set('offset', String(offset));
    const page = await request(`/stats/locations?${params}`);
    if (page.stats === null && page.more === false) page.stats = [];
    if (!Array.isArray(page.stats) || typeof page.more !== 'boolean') {
      throw new Error('Invalid location response');
    }
    for (const row of page.stats) {
      if (typeof row.id !== 'string' || typeof row.name !== 'string' ||
          !Number.isSafeInteger(row.count) || row.count < 0 || seen.has(row.id)) {
        throw new Error('Invalid or duplicate location');
      }
      seen.add(row.id);
      const country = countryByCode.get(row.id);
      if (row.count > 0) locations.push({
        code: country ? row.id : `unknown-${locations.length}`,
        name: country ? row.name : 'Unknown location',
        count: row.count,
        // Country centres are illustrative, never a visitor's precise position.
        coordinates: country?.latlng ?? null,
      });
    }
    if (!page.more) break;
    if (!page.stats.length || offset > 10000) throw new Error('Invalid pagination');
    offset += page.stats.length;
  }
  locations.sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  return {
    since: SINCE,
    updatedAt: now.toISOString(),
    total: locations.reduce((sum, location) => sum + location.count, 0),
    locations,
  };
}

async function main() {
  const token = process.env.GOATCOUNTER_API_TOKEN;
  if (!token) throw new Error('GOATCOUNTER_API_TOKEN is required to refresh visitor statistics');
  let previousRequest = 0;
  const request = async path => {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 350 - (Date.now() - previousRequest))));
    previousRequest = Date.now();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`https://planepig.goatcounter.com/api/v0${path}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(30000),
        });
        if (response.ok) return await response.json();
        if ([401, 403].includes(response.status) || attempt === 2) {
          throw new Error(`GoatCounter statistics request failed (${response.status})`);
        }
      } catch (error) {
        if (attempt === 2 || /\((401|403)\)/.test(error.message)) throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  };
  const data = await loadLocations(request);
  // No credentials, paths, IPs or individual visits are written to the site.
  const destination = new URL('../src/data/visitors.json', import.meta.url);
  await writeFile(destination, `${JSON.stringify(data, null, 2)}\n`);
  await writeFile(new URL('../public/visitor-stats.json', import.meta.url), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Refreshed ${data.locations.length} locations (${data.total} visits)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
