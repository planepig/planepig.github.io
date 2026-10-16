'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ImageViewerProps {
    src: string;
    alt: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageViewer({ src, alt, isOpen, onClose }: ImageViewerProps) {
    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-[60]">
            <div className="fixed inset-0 bg-background/70 dark:bg-neutral-950/70" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel className="flex max-w-[92vw] max-h-[86vh] items-center justify-center bg-background/95 p-2 shadow-xl dark:bg-neutral-900/95">
                    <DialogTitle className="sr-only">{alt}</DialogTitle>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close figure"
                        title="Close (Esc)"
                        className="fixed top-5 right-5 z-10 p-1.5 rounded-full border border-neutral-200/80 bg-background/90 text-neutral-500 shadow-sm hover:text-primary hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-600 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-accent"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={alt} className="max-h-[82vh] w-auto max-w-[min(1040px,88vw)] object-contain" />
                </DialogPanel>
            </div>
            <div className="pointer-events-none fixed bottom-5 left-1/2 -translate-x-1/2 text-neutral-500 text-xs">
                Click outside to close
            </div>
        </Dialog>
    );
}
