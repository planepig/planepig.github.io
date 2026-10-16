'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    CalendarIcon,
    BookOpenIcon,
} from '@heroicons/react/24/outline';
import { Publication } from '@/types/publication';
import { PublicationPageConfig } from '@/types/page';
import { cn } from '@/lib/utils';
import ImageViewer from '@/components/ui/ImageViewer';
import PublicationBadges from '@/components/publications/PublicationBadges';

interface PublicationsListProps {
    config: PublicationPageConfig;
    publications: Publication[];
    embedded?: boolean;
    viewAllHref?: string;
}

function getPreviewSrc(preview: string) {
    return `/papers/${preview.replace(/^\/+/, '')}`;
}

export default function PublicationsList({ config, publications, embedded = false, viewAllHref }: PublicationsListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
    const [selectedType, setSelectedType] = useState<string | 'all'>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);

    // Extract unique years and types for filters
    const years = useMemo(() => {
        const uniqueYears = Array.from(new Set(publications.map(p => p.year)));
        return uniqueYears.sort((a, b) => b - a);
    }, [publications]);

    const types = useMemo(() => {
        const uniqueTypes = Array.from(new Set(publications.map(p => p.type)));
        return uniqueTypes.sort();
    }, [publications]);

    // Filter publications
    const filteredPublications = useMemo(() => {
        return publications.filter(pub => {
            const matchesSearch =
                pub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pub.authors.some(author => author.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                pub.journal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pub.conference?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesYear = selectedYear === 'all' || pub.year === selectedYear;
            const matchesType = selectedType === 'all' || pub.type === selectedType;

            return matchesSearch && matchesYear && matchesType;
        });
    }, [publications, searchQuery, selectedYear, selectedType]);

    const renderPublicationCard = (pub: Publication, index: number) => {
        const previewSrc = pub.preview ? getPreviewSrc(pub.preview) : '';

        return (
            <motion.div
                key={pub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className="w-full bg-white dark:bg-neutral-900 p-5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 hover:shadow-md transition-all duration-200"
            >
                {pub.preview && (
                    <button
                        type="button"
                        aria-label={`View figure: ${pub.title}`}
                        className="relative mb-4 flex min-h-32 w-full cursor-pointer items-center justify-center overflow-hidden group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                        onClick={() => setViewerImage({ src: previewSrc, alt: pub.title })}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewSrc}
                            alt={pub.title}
                            className="h-auto max-h-44 w-full object-contain group-hover:scale-[1.02] transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 flex items-center justify-center">
                            <MagnifyingGlassIcon className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        </div>
                    </button>
                )}
                <div className="flex flex-1 flex-col">
                    <h3 className={`${embedded ? "text-base" : "text-lg"} font-semibold text-primary mb-2 leading-tight`}>
                        {pub.title}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-500 mb-2">
                        {pub.authors.map((author, idx) => (
                            <span key={idx}>
                                <span className={`${author.isHighlighted ? 'font-semibold text-accent' : ''} ${author.isCoAuthor ? `underline underline-offset-4 ${author.isHighlighted ? 'decoration-accent' : 'decoration-neutral-400'}` : ''}`}>
                                    {author.name}
                                </span>
                                {author.isCorresponding && (
                                    <sup className={`ml-0 ${author.isHighlighted ? 'text-accent' : 'text-neutral-600 dark:text-neutral-400'}`}>†</sup>
                                )}
                                {idx < pub.authors.length - 1 && ', '}
                            </span>
                        ))}
                    </p>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-600 mb-3">
                        {pub.journal || pub.conference} {pub.year}
                    </p>
                    <PublicationBadges pub={pub} className="mt-auto" />
                </div>
            </motion.div>
        );
    };

    const leftColumnPublications = filteredPublications.filter((_, index) => index % 2 === 0);
    const rightColumnPublications = filteredPublications.filter((_, index) => index % 2 === 1);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
        >
            <div className="mb-8">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <h1 className={`${embedded ? "text-2xl" : "text-4xl"} font-serif font-bold text-primary`}>{config.title}</h1>
                    {embedded && viewAllHref && (
                        <a
                            href={viewAllHref}
                            target={viewAllHref.startsWith('/') ? undefined : '_blank'}
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent-dark text-sm font-medium whitespace-nowrap transition-all duration-200 rounded hover:bg-accent/10 hover:shadow-sm"
                        >
                            View All -&gt;
                        </a>
                    )}
                </div>
                {config.description && (
                    <p className={`${embedded ? "text-base" : "text-lg"} text-neutral-600 dark:text-neutral-500 max-w-2xl`}>
                        {config.description}
                    </p>
                )}
            </div>

            {!embedded && (
            <div className="mb-8 space-y-4">
                {/* ... (keep existing controls) ... */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-grow">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search publications..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "flex items-center justify-center px-4 py-2 rounded-lg border transition-all duration-200",
                            showFilters
                                ? "bg-accent text-white border-accent"
                                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:border-accent hover:text-accent"
                        )}
                    >
                        <FunnelIcon className="h-5 w-5 mr-2" />
                        Filters
                    </button>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-6">
                                {/* Year Filter */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center">
                                        <CalendarIcon className="h-4 w-4 mr-1" /> Year
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setSelectedYear('all')}
                                            className={cn(
                                                "px-3 py-1 text-xs rounded-full transition-colors",
                                                selectedYear === 'all'
                                                    ? "bg-accent text-white"
                                                    : "bg-white dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                            )}
                                        >
                                            All
                                        </button>
                                        {years.map(year => (
                                            <button
                                                key={year}
                                                onClick={() => setSelectedYear(year)}
                                                className={cn(
                                                    "px-3 py-1 text-xs rounded-full transition-colors",
                                                    selectedYear === year
                                                        ? "bg-accent text-white"
                                                        : "bg-white dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                                )}
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Type Filter */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center">
                                        <BookOpenIcon className="h-4 w-4 mr-1" /> Type
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setSelectedType('all')}
                                            className={cn(
                                                "px-3 py-1 text-xs rounded-full transition-colors",
                                                selectedType === 'all'
                                                    ? "bg-accent text-white"
                                                    : "bg-white dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                            )}
                                        >
                                            All
                                        </button>
                                        {types.map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setSelectedType(type)}
                                                className={cn(
                                                    "px-3 py-1 text-xs rounded-full capitalize transition-colors",
                                                    selectedType === type
                                                        ? "bg-accent text-white"
                                                        : "bg-white dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                                )}
                                            >
                                                {type.replace('-', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            )}

            {/* Publications Grid */}
            <div className="@container">
                {filteredPublications.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500">
                        No publications found matching your criteria.
                    </div>
                ) : (
                    <>
                        <div className="space-y-6 @[42rem]:hidden">
                            {filteredPublications.map((pub, index) => renderPublicationCard(pub, index))}
                        </div>
                        <div className="hidden gap-6 @[42rem]:grid @[42rem]:grid-cols-2">
                            <div className="space-y-6">
                                {leftColumnPublications.map((pub) => {
                                    const originalIndex = filteredPublications.indexOf(pub);
                                    return renderPublicationCard(pub, originalIndex);
                                })}
                            </div>
                            <div className="space-y-6">
                                {rightColumnPublications.map((pub) => {
                                    const originalIndex = filteredPublications.indexOf(pub);
                                    return renderPublicationCard(pub, originalIndex);
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Image Viewer */}
            <ImageViewer
                src={viewerImage?.src || ''}
                alt={viewerImage?.alt || ''}
                isOpen={!!viewerImage}
                onClose={() => setViewerImage(null)}
            />
        </motion.div>
    );
}
