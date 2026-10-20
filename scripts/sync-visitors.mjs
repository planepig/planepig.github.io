import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import countries from 'world-countries';
import { createLocationLoader } from '../src/lib/visitor-data.mjs';
export { SINCE } from '../src/lib/visitor-data.mjs';

const { provinces } = JSON.parse(await readFile(new URL('../src/data/china-provinces.json', import.meta.url), 'utf8'));
export const loadLocations = createLocationLoader(countries, provinces);

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
