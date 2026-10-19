import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLocations } from './sync-visitors.mjs';

const now = new Date('2027-10-19T10:00:00Z');
const page = (stats, more = false) => ({ stats, more });

test('paginates countries and province details over the full history without double-counting', async () => {
  const calls = [];
  const result = await loadLocations(async path => {
    const url = new URL(path, 'https://example.test'); calls.push(url);
    const offset = url.searchParams.get('offset');
    if (url.pathname === '/stats/locations') return offset === '0'
      ? page([{ id: 'CN', name: 'China', count: 7 }], true)
      : page([{ id: 'US', name: 'United States', count: 4 }]);
    if (url.pathname.endsWith('/CN')) return offset === '0'
      ? page([{ name: 'Guangdong', count: 4, ip: 'must not leak' }], true)
      : page([{ name: 'Beijing', count: 2 }, { name: '(unknown)', count: 1 }]);
    return page([{ name: 'California', count: 4 }]);
  }, now);
  assert.ok(calls.every(url => url.searchParams.get('start') === '2026-10-19T00:00:00Z'));
  assert.deepEqual(calls.map(url => url.searchParams.get('offset')), ['0', '1', '0', '1', '0']);
  assert.equal(result.total, 11);
  const china = result.locations[0];
  assert.equal(china.regions.reduce((sum, region) => sum + region.count, 0), china.count);
  assert.equal(china.regions[0].code, 'CN-44');
  assert.equal(china.regions[0].localName, '广东省');
  assert.ok(china.regions[0].coordinates[0] > 20 && china.regions[0].coordinates[0] < 26);
  assert.equal(china.regions[2].coordinates, null);
  assert.equal(result.locations[1].regions[0].name, 'California');
  assert.ok(!JSON.stringify(result).includes('must not leak'));
});

test('empty responses do not fabricate locations', async () => {
  const result = await loadLocations(async () => page(null));
  assert.equal(result.total, 0); assert.deepEqual(result.locations, []);
});

test('unknown countries and unresolved regions are not assigned invented coordinates', async () => {
  const result = await loadLocations(async path => path.startsWith('/stats/locations?')
    ? page([{ id: 'CN', name: 'China', count: 3 }, { id: '??', name: 'Unknown', count: 2 }])
    : page([{ name: 'Unmapped province', count: 1 }]));
  assert.equal(result.total, 5);
  assert.equal(result.locations[0].regions[0].coordinates, null);
  assert.equal(result.locations[0].regions[1].count, 2);
  assert.equal(result.locations[1].coordinates, null);
});

test('reconciles new visits arriving between aggregate and detailed requests', async () => {
  const result = await loadLocations(async path => path.startsWith('/stats/locations?')
    ? page([{ id: 'CN', name: 'China', count: 2 }])
    : page([{ name: 'Guangdong', count: 3 }]));
  assert.equal(result.total, 3);
  assert.equal(result.locations[0].count, 3);
});

test('rejects negative counts, duplicate results and broken pagination', async () => {
  for (const response of [page([], true), page([{ id: 'US', name: 'US', count: -1 }]),
    page([{ id: 'US', name: 'US', count: 1 }], true), { error: 'unauthorized' }]) {
    await assert.rejects(loadLocations(async () => response));
  }
});
