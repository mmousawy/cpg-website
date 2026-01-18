'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePhotoCounts } from '@/hooks/usePhotoCounts';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import FolderMicroSVG from 'public/icons/folder-micro.svg';
import PhotoMicroSVG from 'public/icons/image-micro.svg';

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={clsx('animate-pulse bg-foreground/10', className)}
      style={style}
    />
  );
}

/**
 * Loading state for manage pages.
 * Shows actual header structure (tabs) to avoid layout shift, but only
 * content skeleton to avoid showing skeleton loaders for UI elements.
 */
export default function ManageLoading() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: counts } = usePhotoCounts(user?.id);
  const photoCount = counts?.photoCount ?? 0;
  const albumCount = counts?.albumCount ?? 0;

  const isPhotosActive = pathname === '/account/photos';
  const isAlbumsActive = pathname.startsWith('/account/albums');

  return (
    <div
      className="flex h-[calc(100svh-57px)] md:h-[calc(100svh-73px)] w-full select-none"
    >
      {/* Left Panel - Content */}
      <div
        className="flex flex-1 flex-col overflow-y-auto border-r border-border-color md:border-r"
      >
        {/* Header - show actual tabs, not skeleton */}
        <div
          className="sticky top-0 z-20 border-b border-border-color bg-background-light px-2 py-2"
        >
          <div
            className="flex items-center justify-between gap-4"
          >
            {/* Left side: tabs */}
            <div
              className="flex items-center gap-4"
            >
              {/* Tab navigation */}
              <div
                className="flex"
              >
                <Link
                  href="/account/photos"
                  className={clsx(
                    'flex items-center gap-1.5 md:gap-2 rounded-tl-full rounded-bl-full border-2 px-2 py-1.5 font-(family-name:--font-geist-mono) text-sm font-medium transition-colors',
                    isPhotosActive
                      ? 'border-primary bg-primary/10 text-primary z-10'
                      : 'border-border-color-strong bg-background text-foreground hover:border-primary hover:bg-primary/5',
                  )}
                >
                  <PhotoMicroSVG
                    className="size-4"
                  />
                  <span
                    className="hidden md:inline"
                  >
                    Photos
                  </span>
                  <div
                    className="flex px-1 py-0.5 items-center justify-center rounded-full bg-foreground/10 text-xs"
                  >
                    {photoCount}
                  </div>
                </Link>
                <Link
                  href="/account/albums"
                  className={clsx(
                    '-ml-[2px] flex items-center gap-1.5 md:gap-2 rounded-tr-full rounded-br-full border-2 px-2 py-1.5 font-(family-name:--font-geist-mono) text-sm font-medium transition-colors',
                    isAlbumsActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border-color-strong bg-background text-foreground hover:border-primary hover:bg-primary/5',
                  )}
                >
                  <FolderMicroSVG
                    className="size-4"
                  />
                  <span
                    className="hidden md:inline"
                  >
                    Albums
                  </span>
                  <div
                    className="flex px-1 py-0.5 items-center justify-center rounded-full bg-foreground/10 text-xs"
                  >
                    {albumCount}
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Grid skeleton - matches SelectableGrid styles */}
        <div
          className="flex-1 overflow-hidden p-3 md:p-6"
        >
          <div
            className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(144px,1fr))] content-start"
          >
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton
                key={i}
                className="aspect-square bg-background-light"
                style={{
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Sidebar skeleton (hidden on mobile) */}
      <div
        className="hidden md:flex h-[calc(100vh-73px)] w-[400px] shrink-0 flex-col items-center justify-center bg-background-light p-10 text-center"
      >
        <Skeleton
          className="mb-2 size-10 rounded"
        />
        <Skeleton
          className="mb-2 h-6 w-48 rounded"
        />
        <Skeleton
          className="h-4 w-56 rounded"
        />
      </div>
    </div>
  );
}
