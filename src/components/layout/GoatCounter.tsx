'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    goatcounter?: { count: (data: { path: string; referrer: string }) => void };
  }
}

export default function GoatCounter({ siteUrl }: { siteUrl: string }) {
  const path = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    setEnabled(window.location.origin === new URL(siteUrl).origin);
  }, [siteUrl]);

  useEffect(() => {
    if (!enabled || !ready || !path || lastPath.current === path) return;
    // Count client-side navigation once, without query strings or referrer URLs.
    window.goatcounter?.count({ path, referrer: '' });
    lastPath.current = path;
  }, [enabled, ready, path]);

  if (!enabled) return null;
  return <Script
    id="goatcounter"
    src="/vendor/goatcounter.js"
    data-goatcounter="https://planepig.goatcounter.com/count"
    data-goatcounter-settings='{"no_onload":true}'
    strategy="afterInteractive"
    onReady={() => setReady(true)}
  />;
}
