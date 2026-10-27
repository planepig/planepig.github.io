'use client';
import { useEffect, useSyncExternalStore } from 'react';
import initial from '@/data/visitors.json';
import { VISITOR_API } from './visitor-snapshot';
import { createVisitorStore } from './visitor-store.mjs';

const store = createVisitorStore({ initial, api: VISITOR_API, getStorage: () => window.localStorage });

export function useVisitorSnapshot() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => store.activate(), []);
  return state;
}
