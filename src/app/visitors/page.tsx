import type { Metadata } from 'next';
import Link from 'next/link';
import VisitorStatistics from '@/components/visitors/VisitorStatistics';
import { VISITOR_API } from '@/lib/visitor-snapshot';
import visitors from '@/data/visitors.json';

export const metadata: Metadata = {
  title: 'Visitors',
  description: 'A glimpse of where visitors to Junyi Zhou’s website come from.',
  alternates: { canonical: '/visitors/' },
};

export default function VisitorsPage() {
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <Link href="/" className="inline-block mb-6 text-sm font-medium text-accent hover:underline">&larr; Back to homepage</Link>
    <VisitorStatistics initial={visitors} />
    <div className="mt-5 space-y-2 text-xs leading-relaxed text-neutral-500">
      <p>IP-based locations are approximate. Province markers use representative centres, not visitor addresses. Counts are cumulative since geographic tracking began. Earlier views have no location data. The footer’s page-view counter uses a different counting method.</p>
      <p>Only aggregate locations and counts are displayed. Statistics by <a href="https://www.goatcounter.com/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">GoatCounter</a> · <a href="https://www.goatcounter.com/help/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy</a></p>
      <p>Country centres: <a href="https://github.com/mledoze/countries" className="hover:underline">mledoze/countries</a> (<a href="https://opendatacommons.org/licenses/odbl/1-0/" className="hover:underline">ODbL</a>) · Province centres: <a href="https://datav.aliyun.com/portal/school/atlas/area_selector" className="hover:underline">DataV GeoAtlas</a> · <a href={VISITOR_API} className="hover:underline">Aggregate data</a></p>
    </div>
  </div>;
}
