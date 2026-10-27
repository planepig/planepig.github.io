import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisitorStore } from '../src/lib/visitor-store.mjs';

const instant = Date.now();
const sample = (total = 4, at = instant) => ({ since: '2026-10-19', updatedAt: new Date(at).toISOString(), total,
  locations: [{ code: 'CN', name: 'China', count: total, coordinates: [35, 105] }] });
const api = 'https://stats.example/visitor-stats.json';

test('footer and map share one pending request while displaying the seeded count immediately', async () => {
  let finish; let calls = 0;
  const store = createVisitorStore({ initial: sample(), api,
    fetcher: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const first = store.refresh(); const second = store.refresh();
  await Promise.resolve();
  assert.equal(store.getSnapshot().snapshot.total, 4); assert.equal(calls, 1);
  finish(new Response(JSON.stringify(sample(5))));
  await Promise.all([first, second]);
  assert.equal(store.getSnapshot().snapshot.total, 5);
  assert.equal(store.getServerSnapshot().snapshot.total, 4);
});

test('failed requests never erase the previous count or fake a newer timestamp', async () => {
  const initial = sample();
  const store = createVisitorStore({ initial, api, fetcher: async () => new Response('', { status: 503 }) });
  await store.refresh();
  assert.deepEqual(store.getSnapshot().snapshot, initial); assert.equal(store.getSnapshot().failed, true);
});

test('malformed, older, and regressing snapshots cannot replace known history', async () => {
  for (const candidate of [{}, sample(6, instant - 1000), sample(2, instant + 1000)]) {
    const initial = sample();
    const store = createVisitorStore({ initial, api, fetcher: async () => new Response(JSON.stringify(candidate)) });
    await store.refresh(); assert.deepEqual(store.getSnapshot().snapshot, initial);
  }
});

test('a returning visitor sees cached history even if the network is unavailable', async () => {
  const cached = sample(8);
  const store = createVisitorStore({ initial: sample(4, instant - 1000), api,
    getStorage: () => ({ getItem: () => JSON.stringify(cached), setItem() {} }),
    fetcher: async () => { throw new Error('offline'); } });
  const stop = store.activate(); await store.refresh();
  assert.deepEqual(store.getSnapshot().snapshot, cached); stop();
});

test('two mounted consumers use one refresh and receive the same successful snapshot', async () => {
  let calls = 0; let notifications = 0;
  const store = createVisitorStore({ initial: sample(), api,
    fetcher: async () => { calls++; return new Response(JSON.stringify(sample(9))); } });
  const unsubscribe = store.subscribe(() => { notifications++; });
  const stopFooter = store.activate(); const stopMap = store.activate();
  await store.refresh();
  assert.equal(calls, 1); assert.equal(store.getSnapshot().snapshot.total, 9); assert.ok(notifications >= 2);
  stopMap(); stopFooter(); unsubscribe();
});

test('disabled browser storage does not block live data', async () => {
  const store = createVisitorStore({ initial: sample(), api,
    getStorage: () => { throw new Error('storage blocked'); },
    fetcher: async () => new Response(JSON.stringify(sample(7))) });
  const stop = store.activate(); await store.refresh();
  assert.equal(store.getSnapshot().snapshot.total, 7); stop();
});

test('a synchronous network failure does not leave the store permanently stuck', async () => {
  let calls = 0;
  const store = createVisitorStore({ initial: sample(), api, fetcher: () => {
    calls++;
    if (calls === 1) throw new Error('request failed');
    return Promise.resolve(new Response(JSON.stringify(sample(10))));
  } });
  await store.refresh(); await store.refresh();
  assert.equal(calls, 2); assert.equal(store.getSnapshot().snapshot.total, 10);
});
