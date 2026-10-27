import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker, SNAPSHOT_KEY, STATUS_KEY, MAX_AGE_MS } from './worker.mjs';
import seed from './seed.json' with { type: 'json' };

const quiet = { info() {}, error() {} };
const instant = Date.now();
const snapshot = (at = instant) => ({ ...structuredClone(seed), updatedAt: new Date(at).toISOString() });
function storage(initial = snapshot()) {
  const values = new Map([[SNAPSHOT_KEY, JSON.stringify(initial)]]);
  return { values, get: async key => values.has(key) ? JSON.parse(values.get(key)) : null,
    put: async (key, value) => { values.set(key, value); } };
}
const request = headers => new Request('https://stats.example/visitor-stats.json', { headers });

test('expired public reads return the stored snapshot without starting or waiting for upstream', async () => {
  const saved = snapshot(instant - MAX_AGE_MS - 1);
  let called = false;
  const worker = createWorker({ now: () => instant, loader: () => { called = true; return new Promise(() => {}); } });
  const response = await worker.fetch(request(), { STATS: storage(saved) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).updatedAt, saved.updatedAt);
  assert.equal(called, false);
  assert.match(response.headers.get('Cache-Control'), /public.*s-maxage=60/);
});

test('conditional reads and HEAD share the cached snapshot and do not return secret values', async () => {
  const worker = createWorker({ now: () => instant });
  const env = { STATS: storage(), GOATCOUNTER_API_TOKEN: 'private-secret' };
  const response = await worker.fetch(request(), env);
  const etag = response.headers.get('ETag');
  assert.ok(!(await response.text()).includes('private-secret'));
  assert.equal((await worker.fetch(request({ 'If-None-Match': etag }), env)).status, 304);
  const head = await worker.fetch(new Request('https://stats.example/visitor-stats.json', { method: 'HEAD' }), env);
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
});

test('native scheduled execution persists newer data and a backup of the previous history', async () => {
  const saved = snapshot(instant - MAX_AGE_MS);
  const next = snapshot(); next.total++; next.locations[0].count++;
  const env = { STATS: storage(saved) };
  const worker = createWorker({ now: () => instant, loader: async () => next, logger: quiet });
  await worker.scheduled({ scheduledTime: instant }, env);
  assert.deepEqual(await env.STATS.get(SNAPSHOT_KEY), next);
  assert.deepEqual(await env.STATS.get('previous-snapshot'), saved);
  assert.equal((await env.STATS.get(STATUS_KEY)).success, true);
});

test('upstream failures retain all history and report a sanitized failure', async () => {
  const saved = snapshot(instant - MAX_AGE_MS);
  const env = { STATS: storage(saved) };
  const worker = createWorker({ now: () => instant, loader: async () => { throw new Error('private-secret'); }, logger: quiet });
  await assert.rejects(worker.scheduled({ scheduledTime: instant }, env), /Statistics refresh failed/);
  assert.deepEqual(await env.STATS.get(SNAPSHOT_KEY), saved);
  const status = await env.STATS.get(STATUS_KEY);
  assert.equal(status.success, false); assert.ok(!JSON.stringify(status).includes('private-secret'));
});

test('partial or regressing history cannot replace a good snapshot', async () => {
  const saved = snapshot(instant - 300000);
  const next = snapshot(); next.total--; next.locations[0].count--;
  const env = { STATS: storage(saved) };
  const worker = createWorker({ now: () => instant, loader: async () => next, logger: quiet });
  await assert.rejects(worker.scheduled({ scheduledTime: instant }, env), /Historical counts would decrease/);
  assert.deepEqual(await env.STATS.get(SNAPSHOT_KEY), saved);
});

test('public callers cannot trigger a refresh or write data', async () => {
  const worker = createWorker();
  const env = { STATS: storage() };
  assert.equal((await worker.fetch(new Request('https://stats.example/refresh', { method: 'POST' }), env)).status, 405);
  assert.equal((await worker.fetch(new Request('https://stats.example/setup'), env)).status, 404);
});

test('authentication errors fail once rather than retrying invalid credentials', async () => {
  let calls = 0;
  const worker = createWorker({ now: () => instant, sleep: async () => {}, logger: quiet,
    loader: async get => { await get('/stats/locations'); return snapshot(); },
    fetcher: async () => { calls++; return new Response('', { status: 401 }); } });
  const env = { STATS: storage(), GOATCOUNTER_API_TOKEN: 'private-secret' };
  await assert.rejects(worker.scheduled({ scheduledTime: instant }, env), /Statistics authentication failed/);
  assert.equal(calls, 1);
});

test('edge cache serves repeated reads without accessing KV or the upstream', async () => {
  const entries = new Map();
  const cache = { match: async request => entries.get(request.url)?.clone(),
    put: async (request, response) => { entries.set(request.url, response); } };
  const jobs = [];
  const ctx = { waitUntil: job => { jobs.push(job); } };
  const worker = createWorker({ now: () => instant, cache });
  const first = await worker.fetch(request(), { STATS: storage() }, ctx);
  await Promise.all(jobs);
  const second = await worker.fetch(request(), { STATS: { get() { throw new Error('must use edge cache'); } } }, ctx);
  assert.equal(second.status, 200);
  assert.deepEqual(await second.json(), await first.json());
  assert.match(second.headers.get('Cache-Control'), /max-age=30/);
});
