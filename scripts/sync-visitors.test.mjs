import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLocations } from './sync-visitors.mjs';

test('loads every page over the full tracking period and publishes only aggregates', async () => {
  const calls = [];
  const result = await loadLocations(async path => {
    calls.push(new URL(path, 'https://example.test'));
    return calls.length === 1
      ? { stats: [{ id: 'HK', name: 'Hong Kong', count: 12, ip: 'must not leak' }], more: true }
      : { stats: [{ id: 'US', name: 'United States', count: 4 }], more: false };
  }, new Date('2027-10-19T10:00:00Z'));
  assert.equal(calls[1].searchParams.get('offset'), '1');
  assert.equal(calls[0].searchParams.get('start'), '2026-10-19T00:00:00Z');
  assert.equal(result.total, 16);
  assert.equal(result.locations[0].code, 'HK');
  assert.equal(result.locations[0].coordinates.length, 2);
  assert.ok(!JSON.stringify(result).includes('must not leak'));
});

test('empty statistics do not fabricate locations', async () => {
  const result = await loadLocations(async () => ({ stats: null, more: false }));
  assert.equal(result.total, 0);
  assert.deepEqual(result.locations, []);
});

test('unknown countries are never assigned fabricated coordinates', async () => {
  const result = await loadLocations(async () => ({ stats: [{ id: '??', name: 'Unknown', count: 2 }], more: false }));
  assert.equal(result.locations[0].coordinates, null);
  assert.equal(result.total, 2);
});

test('rejects malformed, duplicated or broken pagination results', async () => {
  for (const response of [
    { stats: [], more: true },
    { stats: [{ id: 'US', name: 'US', count: -1 }], more: false },
    { stats: [{ id: 'US', name: 'US', count: 1 }], more: true },
    { error: 'unauthorized' },
  ]) await assert.rejects(loadLocations(async () => response));
});
