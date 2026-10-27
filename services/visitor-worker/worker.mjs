import { createLocationLoader } from '../../src/lib/visitor-data.mjs';
import { isVisitorSnapshot } from '../../src/lib/visitor-snapshot.ts';
import coordinates from './locations.json' with { type: 'json' };
import seed from './seed.json' with { type: 'json' };

export const SNAPSHOT_KEY = 'snapshot';
export const STATUS_KEY = 'sync-status';
export const MAX_AGE_MS = 15 * 60 * 1000;
const loadLocations = createLocationLoader(coordinates.countries, coordinates.provinces);

const responseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300, stale-if-error=86400',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex',
};

export function preservesHistory(next, previous) {
  return next.since === previous.since && next.total >= previous.total &&
    previous.locations.every(old => next.locations.some(item => item.code === old.code && item.count >= old.count));
}

export function createWorker({ loader = loadLocations, fetcher = fetch, now = Date.now,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), logger = console,
  cache = globalThis.caches?.default } = {}) {
  async function storedSnapshot(env) {
    const saved = await env.STATS.get(SNAPSHOT_KEY, 'json');
    if (saved === null) return seed;
    if (!isVisitorSnapshot(saved)) throw new Error('Invalid stored snapshot');
    return saved;
  }

  async function synchronize(env, scheduledTime) {
    const startedAt = now();
    const deadline = startedAt + 90_000;
    let lastRequest = 0;
    const previous = await storedSnapshot(env);
    const request = async path => {
      if (!env.GOATCOUNTER_API_TOKEN) throw new Error('Statistics credential missing');
      for (let attempt = 0; attempt < 2; attempt++) {
        await sleep(Math.max(0, 350 - (now() - lastRequest)));
        const remaining = deadline - now();
        if (remaining <= 0) throw new Error('Statistics refresh deadline exceeded');
        lastRequest = now();
        try {
          const response = await fetcher(`https://planepig.goatcounter.com/api/v0${path}`, {
            headers: { Authorization: `Bearer ${env.GOATCOUNTER_API_TOKEN}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(Math.min(8000, remaining)),
          });
          if ([401, 403].includes(response.status)) throw new Error('Statistics authentication failed');
          if (!response.ok) throw new Error('Statistics upstream unavailable');
          return await response.json();
        } catch (error) {
          if (error.message === 'Statistics authentication failed') throw error;
          if (attempt === 1) throw new Error('Statistics upstream unavailable');
          await sleep(700);
        }
      }
    };

    try {
      const data = await loader(request, new Date(startedAt));
      if (!isVisitorSnapshot(data)) throw new Error('Invalid statistics');
      if (!preservesHistory(data, previous)) throw new Error('Historical counts would decrease');
      // The old snapshot is retained before the new aggregate replaces it.
      await env.STATS.put('previous-snapshot', JSON.stringify(previous));
      await env.STATS.put(SNAPSHOT_KEY, JSON.stringify(data));
      await env.STATS.put(STATUS_KEY, JSON.stringify({ scheduledTime, completedAt: new Date(now()).toISOString(), success: true }));
      logger.info('visitor_sync_succeeded', { scheduledTime, updatedAt: data.updatedAt, total: data.total });
      return data;
    } catch (error) {
      const safeMessages = new Set(['Statistics credential missing', 'Statistics authentication failed',
        'Statistics upstream unavailable', 'Statistics refresh deadline exceeded', 'Invalid statistics', 'Historical counts would decrease']);
      const reason = safeMessages.has(error.message) ? error.message : 'Statistics refresh failed';
      await env.STATS.put(STATUS_KEY, JSON.stringify({ scheduledTime, completedAt: new Date(now()).toISOString(), success: false, reason }));
      logger.error('visitor_sync_failed', { scheduledTime, reason });
      throw new Error(reason);
    }
  }

  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders });
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Read-only endpoint', { status: 405, headers: responseHeaders });
      if (!['/', '/visitor-stats.json'].includes(url.pathname)) return new Response('Not found', { status: 404, headers: responseHeaders });
      try {
        const cacheKey = new Request(new URL('/visitor-stats.json', url));
        if (cache && request.method === 'GET') {
          const cached = await cache.match(cacheKey);
          if (cached) {
            const headers = new Headers(cached.headers);
            headers.set('Cache-Control', responseHeaders['Cache-Control']);
            if (request.headers.get('If-None-Match') === headers.get('ETag')) return new Response(null, { status: 304, headers });
            return new Response(cached.body, { headers });
          }
        }
        // Reads never refresh upstream: slow or failed collection cannot block visitors.
        const saved = await storedSnapshot(env);
        const data = { ...saved, stale: now() - Date.parse(saved.updatedAt) > MAX_AGE_MS };
        const etag = `"${saved.updatedAt}-${data.stale ? 'stale' : 'fresh'}"`;
        const headers = { ...responseHeaders, ETag: etag };
        if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers });
        const response = new Response(request.method === 'HEAD' ? null : JSON.stringify(data), { headers });
        if (cache && ctx && request.method === 'GET') {
          const edgeCopy = response.clone();
          edgeCopy.headers.set('Cache-Control', 'public, max-age=60');
          ctx.waitUntil(cache.put(cacheKey, edgeCopy).catch(() => {}));
        }
        return response;
      } catch {
        return new Response('{"error":"Statistics temporarily unavailable"}', {
          status: 503, headers: { ...responseHeaders, 'Cache-Control': 'no-store', 'Retry-After': '60' },
        });
      }
    },
    async scheduled(event, env) { await synchronize(env, event.scheduledTime); },
  };
}

export default createWorker();
