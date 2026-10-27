'use client';

import VisitorGlobe from './VisitorGlobe';
import { useVisitorSnapshot } from '@/lib/useVisitorSnapshot';

export default function VisitorStatistics() {
  const { snapshot, checkedAt } = useVisitorSnapshot();
  const delayed = !!checkedAt && !!snapshot.updatedAt && checkedAt - Date.parse(snapshot.updatedAt) > 15 * 60 * 1000;
  const updated = snapshot.updatedAt && checkedAt ? new Date(snapshot.updatedAt).toLocaleString('en-GB', {
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
      Since Oct 19, 2026 · {delayed ? 'Showing last available statistics · Update delayed' : 'Updated every 5 minutes'}
      {updated && <> · Last synced: <time dateTime={snapshot.updatedAt!}>{updated}</time></>}
    </p>
  </>;
}
