'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const CACHE_KEY = 'junyi-site-pageviews';

function parseCount(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export default function SiteViews({ siteUrl }: { siteUrl: string }) {
  const [enabled, setEnabled] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const [delayed, setDelayed] = useState(false);
  const counter = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Only the published site contributes to the counter, never local previews.
    setEnabled(window.location.origin === new URL(siteUrl).origin);
  }, [siteUrl]);

  useEffect(() => {
    if (!enabled || !counter.current) return;

    try { setCount(parseCount(localStorage.getItem(CACHE_KEY))); } catch { /* Storage is optional. */ }

    const element = counter.current;
    const update = () => {
      const value = parseCount(element.textContent);
      if (value === null) return;
      setCount(value);
      setLive(true);
      setDelayed(false);
      try { localStorage.setItem(CACHE_KEY, String(value)); } catch { /* Storage is optional. */ }
    };
    const observer = new MutationObserver(update);
    observer.observe(element, { childList: true, characterData: true, subtree: true });
    update();
    const timeout = window.setTimeout(() => setDelayed(true), 10000);
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [enabled]);

  const title = live ? 'View the visitor globe' : count !== null
    ? 'Last saved page-view count. Open the visitor globe for geographic statistics.'
    : delayed ? 'Page-view counter temporarily unavailable. The visitor globe is still available.'
    : 'Loading page views. Open the visitor globe for geographic statistics.';

  return (
    <>
      {/* Keep the map accessible even when the third-party counter is unavailable. */}
      <span className="whitespace-nowrap">
        <span aria-hidden="true" className="mr-2 hidden sm:inline">|</span>
        <Link href="/visitors/" className="hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" title={title}>
          Views: <span>{count === null ? '—' : count.toLocaleString('en-US')}</span>{' '}
          (since <time dateTime="2026-10-19">Oct 19, 2026</time>)
        </Link>
      </span>
      <span id="busuanzi_value_site_pv" ref={counter} hidden aria-hidden="true" />
      {enabled && <Script
        id="busuanzi-counter"
        src="https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"
        strategy="afterInteractive"
        onError={() => setDelayed(true)}
      />}
    </>
  );
}
