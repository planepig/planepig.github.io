import type { Metadata } from 'next';
import Link from 'next/link';
import VisitorGlobe from '@/components/visitors/VisitorGlobe';
import visitors from '@/data/visitors.json';

export const metadata: Metadata = {
  title: 'Visitors',
  description: 'A glimpse of where visitors to Junyi Zhou’s website come from.',
  alternates: { canonical: '/visitors/' },
};

export default function VisitorsPage() {
  const regions = visitors.locations.filter((location: { coordinates: number[] | null }) => location.coordinates).length;
  const updated = visitors.updatedAt ? new Date(visitors.updatedAt).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) : null;
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <Link href="/" className="inline-block mb-6 text-sm font-medium text-accent hover:underline">&larr; Back to homepage</Link>
    <header className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-4xl font-serif font-bold text-primary">Visitors around the world</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">Thank you for stopping by, wherever you are.</p>
      </div>
      <dl className="flex shrink-0 gap-8">
        <div><dd className="font-serif text-3xl text-primary tabular-nums">{visitors.total.toLocaleString('en-US')}</dd><dt className="mt-1 text-xs text-neutral-500">Cumulative visits</dt></div>
        <div><dd className="font-serif text-3xl text-primary tabular-nums">{regions}</dd><dt className="mt-1 text-xs text-neutral-500">Countries &amp; regions</dt></div>
      </dl>
    </header>
    <VisitorGlobe locations={visitors.locations} />
    <div className="mt-5 space-y-2 text-xs leading-relaxed text-neutral-500">
      <p>Since Oct 19, 2026 · Updated hourly{updated ? ` · Last update: ${updated} UTC` : ''}</p>
      <p>Locations are approximate and show cumulative visits since geographic tracking began. Earlier views have no location data. The footer’s page-view counter uses a different counting method.</p>
      <p>Only aggregate locations and counts are displayed. Statistics by <a href="https://www.goatcounter.com/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">GoatCounter</a> · <a href="https://www.goatcounter.com/help/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy</a></p>
      <p>Country centres: <a href="https://github.com/mledoze/countries" className="hover:underline">mledoze/countries</a> (<a href="https://opendatacommons.org/licenses/odbl/1-0/" className="hover:underline">ODbL</a>) · <a href="/visitor-stats.json" className="hover:underline">Aggregate data</a></p>
    </div>
  </div>;
}
