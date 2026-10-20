import test from 'node:test';
import assert from 'node:assert/strict';
import { isVisitorSnapshot } from '../src/lib/visitor-snapshot.ts';

const sample = () => ({ since: '2026-10-19', updatedAt: '2026-10-19T12:00:00Z', total: 4,
  locations: [{ code: 'CN', name: 'China', count: 4, coordinates: [35, 105],
    regions: [{ code: 'CN-44', name: 'Guangdong', count: 4, coordinates: [23, 113] }] }] });

test('accepts valid aggregate snapshots with and without stale status', () => {
  assert.equal(isVisitorSnapshot(sample()), true);
  assert.equal(isVisitorSnapshot({ ...sample(), stale: true }), true);
});

test('rejects malformed remote data so it cannot replace the last good snapshot', () => {
  for (const value of [null, {}, { ...sample(), total: 8 }, { ...sample(), stale: 'false' },
    { ...sample(), updatedAt: new Date(Date.now() + 600000).toISOString() },
    { ...sample(), locations: [{ ...sample().locations[0], coordinates: [500, 0] }] },
    { ...sample(), locations: [{ ...sample().locations[0], regions: [null] }] }]) {
    assert.equal(isVisitorSnapshot(value), false);
  }
});
