import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import countries from 'world-countries';

export const SINCE = '2026-10-19';
const countryByCode = new Map(countries.map(country => [country.cca2, country]));

const { provinces } = JSON.parse(await readFile(new URL('../src/data/china-provinces.json', import.meta.url), 'utf8'));
const normalize = name => name.toLowerCase().replace(/ province$| municipality$/g, '').trim();
const provinceByName = new Map(provinces.flatMap(province =>
  [province.name, ...province.aliases].map(name => [normalize(name), province])));

async function readPages(request, path, params, detail = false) {
  const rows = [];
  const seen = new Set();
  for (let offset = 0; ; ) {
    params.set('offset', String(offset));
    const page = await request(`${path}?${params}`);
    if (page.stats === null && page.more === false) page.stats = [];
    if (!Array.isArray(page.stats) || typeof page.more !== 'boolean') throw new Error('Invalid location response');
    for (const row of page.stats) {
      const key = detail ? row.name : row.id;
      if (typeof key !== 'string' || typeof row.name !== 'string' ||
          !Number.isSafeInteger(row.count) || row.count < 0 || seen.has(key)) {
        throw new Error('Invalid or duplicate location');
      }
      seen.add(key);
      if (row.count > 0) rows.push(row);
    }
    if (!page.more) return rows;
    if (!page.stats.length || offset > 10000) throw new Error('Invalid pagination');
    offset += page.stats.length;
  }
}

// Country totals and province/state breakdowns cover the entire tracking period.
export async function loadLocations(request, now = new Date()) {
  const params = new URLSearchParams({ start: `${SINCE}T00:00:00Z`, end: now.toISOString(), limit: '100' });
  const countries = await readPages(request, '/stats/locations', params);
  const locations = [];
  for (const row of countries) {
    const country = countryByCode.get(row.id);
    const details = country ? await readPages(request, `/stats/locations/${encodeURIComponent(row.id)}`, params, true) : [];
    const regions = details.map((detail, index) => {
      const unknown = !detail.name || /^\(?unknown\)?$/i.test(detail.name);
      const province = row.id === 'CN' && !unknown ? provinceByName.get(normalize(detail.name)) : null;
      return {
        code: province?.code ?? `${row.id}-region-${index}`,
        name: unknown ? 'Unspecified region' : detail.name,
        localName: province?.localName ?? null,
        count: detail.count,
        coordinates: province?.coordinates ?? null,
      };
    });
    const detailTotal = regions.reduce((sum, region) => sum + region.count, 0);
    if (country && detailTotal < row.count) {
      const unknown = regions.find(region => region.name === 'Unspecified region');
      if (unknown) unknown.count += row.count - detailTotal;
      else regions.push({
        code: `${row.id}-unspecified`, name: 'Unspecified region', localName: null,
        count: row.count - detailTotal, coordinates: null,
      });
    }
    locations.push({
      code: country ? row.id : `unknown-${locations.length}`,
      name: country ? row.name : 'Unknown location',
      // New visits can arrive between the country and region requests.
      count: Math.max(row.count, detailTotal),
      coordinates: country?.latlng ?? null,
      regions,
    });
  }
  locations.sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  return {
    since: SINCE, updatedAt: now.toISOString(),
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
