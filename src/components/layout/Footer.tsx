'use client';

import SiteViews from './SiteViews';

interface FooterProps {
  lastUpdated?: string;
  siteUrl: string;
}

export default function Footer({ lastUpdated, siteUrl }: FooterProps) {
  return (
    <footer className="border-t border-neutral-200/50 bg-neutral-50/50 dark:bg-neutral-900/50 dark:border-neutral-700/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-neutral-500 sm:justify-start">
            <span>
              Last updated: {lastUpdated || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <SiteViews siteUrl={siteUrl} />
          </div>
          <p className="text-xs text-neutral-500 flex items-center">
            <a href="https://github.com/xyjoey/PRISM" target="_blank" rel="noopener noreferrer">
              Built with PRISM
            </a>
            <span className="ml-2">🚀</span>
          </p>
        </div>

      </div>
    </footer>
  );
}
