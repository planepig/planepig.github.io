import { isVisitorSnapshot } from './visitor-snapshot.ts';

/** @typedef {import('./visitor-snapshot.ts').VisitorSnapshot} VisitorSnapshot */
/** @typedef {{ snapshot: VisitorSnapshot, syncing: boolean, failed: boolean, checkedAt: number | null }} VisitorState */
const CACHE_KEY = 'junyi-visitor-statistics';

/** @param {{initial: VisitorSnapshot, api: string, fetcher?: typeof fetch,
 * getStorage?: () => Pick<Storage, 'getItem' | 'setItem'> | undefined, now?: () => number}} options */
export function createVisitorStore({ initial, api, fetcher = fetch, getStorage, now = Date.now }) {
  /** @type {VisitorState} */
  const initialState = { snapshot: initial, syncing: false, failed: false, checkedAt: null };
  let state = initialState;
  /** @type {Set<() => void>} */
  const listeners = new Set();
  /** @type {Promise<void> | null} */
  let pending = null;
  /** @type {AbortController | null} */
  let controller = null;
  let users = 0;
  let initialized = false;
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let timer;
  /** @param {Partial<VisitorState>} change */
  const update = change => { state = { ...state, ...change }; listeners.forEach(listener => listener()); };
  /** @param {unknown} next */
  const canReplace = next => isVisitorSnapshot(next) && next.since === initial.since &&
    Date.parse(next.updatedAt) >= Date.parse(state.snapshot.updatedAt ?? '') && next.total >= state.snapshot.total;

  const refresh = () => {
    if (pending) return pending;
    if (typeof document !== 'undefined' && document.hidden) return Promise.resolve();
    const requestController = new AbortController();
    controller = requestController;
    update({ syncing: true, checkedAt: now() });
    pending = Promise.resolve().then(async () => {
      const timeout = setTimeout(() => requestController.abort(), 5000);
      try {
        const response = await fetcher(api, { signal: requestController.signal, credentials: 'omit', cache: 'default' });
        if (!response.ok) throw new Error('Statistics unavailable');
        const next = await response.json();
        if (!canReplace(next)) throw new Error('Invalid or older statistics');
        if (requestController.signal.aborted) return;
        update({ snapshot: next, failed: false });
        try { getStorage?.()?.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* Optional browser cache. */ }
      } catch {
        update({ failed: true });
      } finally {
        clearTimeout(timeout);
        controller = null;
        pending = null;
        update({ syncing: false, checkedAt: now() });
      }
    });
    return pending;
  };

  const onVisible = () => { void refresh(); };
  const activate = () => {
    users++;
    if (users === 1) {
      if (!initialized) {
        initialized = true;
        try {
          const saved = JSON.parse(getStorage?.()?.getItem(CACHE_KEY) ?? 'null');
          if (canReplace(saved)) update({ snapshot: saved });
        } catch { /* Optional browser cache. */ }
      }
      void refresh();
      timer = setInterval(onVisible, 60000);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
      if (typeof window !== 'undefined') window.addEventListener('online', onVisible);
    }
    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      users--;
      if (users === 0) {
        clearInterval(timer);
        controller?.abort();
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
        if (typeof window !== 'undefined') window.removeEventListener('online', onVisible);
      }
    };
  };
  return {
    getSnapshot: () => state,
    getServerSnapshot: () => initialState,
    /** @param {() => void} listener */
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    activate, refresh,
  };
}
