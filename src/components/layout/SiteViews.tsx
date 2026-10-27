'use client';

import Link from 'next/link';
import { useVisitorSnapshot } from '@/lib/useVisitorSnapshot';

export default function SiteViews() {
  const { snapshot } = useVisitorSnapshot();
  return (
    <span className="whitespace-nowrap">
      <span aria-hidden="true" className="mr-2 hidden sm:inline">|</span>
      <Link href="/visitors/" className="hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        title="View the visitor globe. The same GoatCounter statistics update every five minutes.">
        Views: <span>{snapshot.total.toLocaleString('en-US')}</span>{' '}
        (since <time dateTime={snapshot.since}>Oct 19, 2026</time>)
      </Link>
    </span>
  );
}
