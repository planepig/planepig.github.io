import type { Metadata } from 'next';
import Link from 'next/link';
import PublicationsList from '@/components/publications/PublicationsList';
import { loadPublications } from '@/lib/publicationData';

export const metadata: Metadata = {
  title: 'All Publications',
  alternates: { canonical: '/publications/' },
};

export default function PublicationsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/#publications" className="inline-block mb-6 text-sm font-medium text-accent hover:underline">
        &larr; Back to homepage
      </Link>
      <PublicationsList
        config={{ type: 'publication', title: 'All Publications', source: 'publications-data.toml' }}
        publications={loadPublications('publications-data.toml')}
      />
    </div>
  );
}
