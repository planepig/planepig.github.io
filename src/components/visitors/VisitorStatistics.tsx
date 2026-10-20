'use client';

import { useEffect, useRef, useState } from 'react';
import VisitorGlobe from './VisitorGlobe';
import { isVisitorSnapshot, VISITOR_API, type VisitorSnapshot } from '@/lib/visitor-snapshot';

export default function VisitorStatistics({ initial }: { initial: VisitorSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [status, setStatus] = useState<'checking' | 'ready' | 'delayed'>('checking');
  const [clock, setClock] = useState<number | null>(null);
  const snapshotRef = useRef(initial);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    let running = false;
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('junyi-visitor-statistics') ?? 'null');
      if (isVisitorSnapshot(saved) && Date.parse(saved.updatedAt!) > Date.parse(initial.updatedAt ?? '1970-01-01')) {
        snapshotRef.current = saved;
        setSnapshot(saved);
      }
    } catch { /* Private browsing may disable browser storage. */ }
    const refresh = async () => {
      if (running || document.hidden) return;
      running = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 25000);
      try {
        const response = await fetch(VISITOR_API, { cache: 'no-store', signal: controller.signal, credentials: 'omit' });
        if (!response.ok) throw new Error('Statistics unavailable');
        const data: unknown = await response.json();
        if (!isVisitorSnapshot(data)) throw new Error('Invalid statistics');
        if (active && Date.parse(data.updatedAt!) >= Date.parse(snapshotRef.current.updatedAt ?? '1970-01-01')) {
          snapshotRef.current = data;
          setSnapshot(data);
          setStatus(data.stale ? 'delayed' : 'ready');
          try { localStorage.setItem('junyi-visitor-statistics', JSON.stringify(data)); } catch { /* Optional cache. */ }
        } else if (active) {
          setStatus('delayed');
        }
      } catch {
        if (active) setStatus('delayed');
      } finally {
        window.clearTimeout(timeout);
        running = false;
        if (active) setClock(Date.now());
      }
    };
    setClock(Date.now());
    void refresh();
    const timer = window.setInterval(() => { setClock(Date.now()); void refresh(); }, 60000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    return () => {
      active = false; controller?.abort(); window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', visible);
    };
  }, [initial]);

  const outdated = !!clock && !!snapshot.updatedAt && clock - Date.parse(snapshot.updatedAt) > 30 * 60 * 1000;
  const delayed = status === 'delayed' || outdated;
  const updated = snapshot.updatedAt && clock ? new Date(snapshot.updatedAt).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }) : null;
  return <>
    <header className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-4xl font-serif font-bold text-primary">Visitors around the world</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">Thank you for stopping by, wherever you are.</p>
      </div>
      <dl className="flex shrink-0 gap-8">
        <div><dd className="font-serif text-3xl text-primary tabular-nums">{snapshot.total.toLocaleString('en-US')}</dd><dt className="mt-1 text-xs text-neutral-500">Cumulative visits</dt></div>
        <div><dd className="font-serif text-3xl text-primary tabular-nums">{snapshot.locations.filter(location => location.coordinates).length}</dd><dt className="mt-1 text-xs text-neutral-500">Countries &amp; regions</dt></div>
      </dl>
    </header>
    <VisitorGlobe locations={snapshot.locations} />
    <p className="mt-5 text-xs leading-relaxed text-neutral-500" role="status">
      Since Oct 19, 2026 · {status === 'checking' ? 'Checking for updates…' : delayed ? 'Showing last available statistics · Update delayed; retrying automatically' : 'Updates automatically while you visit'}
      {updated && <> · Last synced: <time dateTime={snapshot.updatedAt!}>{updated}</time></>}
    </p>
  </>;
}
