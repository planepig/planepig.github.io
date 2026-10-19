'use client';

import Script from 'next/script';
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
        Views: <span id="busuanzi_value_site_pv" />{' '}
        (since <time dateTime="2026-10-19">Oct 19, 2026</time>)
      </span>
      <Script
        id="busuanzi-counter"
        src="https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"
        strategy="afterInteractive"
      />
    </>
  );
}
