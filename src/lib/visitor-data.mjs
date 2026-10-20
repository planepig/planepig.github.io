export const SINCE = '2026-10-19';

export function createLocationLoader(countries, provinces) {
const countryByCode = new Map(countries.map(country => [country.cca2, country]));
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
async function loadLocations(request, now = new Date()) {
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

return loadLocations;
}
