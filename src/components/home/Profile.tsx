'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
    HeartIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { SiteConfig } from '@/lib/config';

interface ProfileProps {
    author: SiteConfig['author'];
    social: SiteConfig['social'];
    features: SiteConfig['features'];
    researchInterests?: string[];
}

export default function Profile({ author, social, features, researchInterests }: ProfileProps) {

    const [hasLiked, setHasLiked] = useState(false);
    const [showThanks, setShowThanks] = useState(false);

    // Check local storage for user's like status
    useEffect(() => {
        if (!features.enable_likes) return;

        const userHasLiked = localStorage.getItem('jiale-website-user-liked');
        if (userHasLiked === 'true') {
            setHasLiked(true);
        }
    }, [features.enable_likes]);

    const handleLike = () => {
        const newLikedState = !hasLiked;
        setHasLiked(newLikedState);

        if (newLikedState) {
            localStorage.setItem('jiale-website-user-liked', 'true');
            setShowThanks(true);
            setTimeout(() => setShowThanks(false), 2000);
        } else {
            localStorage.removeItem('jiale-website-user-liked');
            setShowThanks(false);
        }
    };

    const socialLinks = [
        ...(social.email ? [{
            name: 'Email',
            href: `mailto:${social.email}`,
            label: social.email,
            iconClass: 'fa-solid fa-envelope',
        }] : []),
        ...(social.location || social.location_details ? [{
            name: 'Location',
            href: social.location_url || '#',
            label: social.location || social.location_details?.join(' '),
            iconClass: 'fa-solid fa-location-dot',
        }] : []),
        ...(social.google_scholar || features.show_google_scholar_placeholder ? [{
            name: 'Google Scholar',
            href: social.google_scholar,
            label: 'Google Scholar',
            iconClass: 'fa-brands fa-google-scholar',
        }] : []),
        ...(social.github ? [{
            name: 'GitHub',
            href: social.github,
            label: 'GitHub',
            iconClass: 'fa-brands fa-github',
        }] : []),
        ...(social.linkedin ? [{
            name: 'LinkedIn',
            href: social.linkedin,
            label: 'LinkedIn',
            iconClass: 'fa-brands fa-linkedin',
        }] : []),
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="sticky top-8"
        >
            {/* Profile Image */}
            <div className="w-64 h-64 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                <Image
                    src={author.avatar}
                    alt={author.name}
                    width={256}
                    height={256}
                    className="w-full h-full object-cover object-center"
                    priority
                />
            </div>

            {/* Name and Title */}
            <div className="text-center mb-6">
                <h1 className="text-3xl font-serif font-bold text-primary mb-2">
                    {author.name}
                </h1>
                {author.title && <p className="text-lg text-accent font-medium mb-1">
                    {author.title}
                </p>}
                {author.institution && <p className="text-neutral-600 mb-2">
                    {author.institution}
                </p>}
            </div>

            {/* Contact Links */}
            <div className="mx-auto mb-6 max-w-[17rem] space-y-1 px-2">
                {socialLinks.map((link) => {
                    const Tag = link.href ? 'a' : 'span';
                    return (
                        <Tag
                            key={link.name}
                            href={link.href}
                            target={link.href ? '_blank' : undefined}
                            rel={link.href ? 'noopener noreferrer' : undefined}
                            aria-disabled={!link.href || undefined}
                            title={!link.href ? 'Google Scholar profile coming soon' : undefined}
                            className={`group flex min-h-8 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-neutral-600 transition-colors duration-200 dark:text-neutral-600 ${link.href ? 'hover:bg-neutral-50 hover:text-accent dark:hover:bg-neutral-800/60' : 'opacity-60 cursor-default'}`}
                            aria-label={link.name}
                        >
                            <i className={`${link.iconClass} w-4 flex-shrink-0 text-center text-[1rem] leading-none text-neutral-500 group-hover:text-accent dark:text-neutral-500`} aria-hidden="true" />
                            <span className={`min-w-0 break-words text-sm text-neutral-700 dark:text-neutral-600 ${link.href ? 'group-hover:text-accent' : ''}`}>
                                {link.label}
                            </span>
                        </Tag>
                    );
                })}
            </div>

            {/* Research Interests */}
            {researchInterests && researchInterests.length > 0 && (
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 mb-6 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                    <h3 className="font-semibold text-primary mb-3">Research Interests</h3>
                    <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-500">
                        {researchInterests.map((interest, index) => (
                            <div key={index}>{interest}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* Like Button */}
            {features.enable_likes && (
                <div className="flex justify-center">
                    <div className="relative">
                        <motion.button
                            onClick={handleLike}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${hasLiked
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer'
                                }`}
                        >
                            {hasLiked ? (
                                <HeartSolidIcon className="h-4 w-4" />
                            ) : (
                                <HeartIcon className="h-4 w-4" />
                            )}
                            <span>{hasLiked ? 'Liked' : 'Like'}</span>
                        </motion.button>

                        {/* Thanks bubble */}
                        <AnimatePresence>
                            {showThanks && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                    animate={{ opacity: 1, y: -10, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                    className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap"
                                >
                                    Thanks! 😊
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-accent"></div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
