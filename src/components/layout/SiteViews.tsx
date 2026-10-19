'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function SiteViews({ siteUrl }: { siteUrl: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Only the published site contributes to the counter, never local previews.
    setEnabled(window.location.origin === new URL(siteUrl).origin);
  }, [siteUrl]);

  if (!enabled) return null;

  return (
    <>
      {/* Busuanzi reveals this only after its count request succeeds. */}
      <span id="busuanzi_container_site_pv" className="whitespace-nowrap" style={{ display: 'none' }}>
        <span aria-hidden="true" className="mr-2 hidden sm:inline">|</span>
        <Link href="/visitors/" className="hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" title="View the visitor globe">
          Views: <span id="busuanzi_value_site_pv" />{' '}
          (since <time dateTime="2026-10-19">Oct 19, 2026</time>)
        </Link>
      </span>
      <Script
        id="busuanzi-counter"
        src="https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"
        strategy="afterInteractive"
      />
    </>
  );
}
