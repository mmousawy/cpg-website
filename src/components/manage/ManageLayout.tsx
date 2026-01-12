'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePhotoCounts } from '@/hooks/usePhotoCounts';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import ArrowUpLeftSVG from 'public/icons/arrow-up-left-micro.svg';
import FolderMicroSVG from 'public/icons/folder-micro.svg';
import PhotoMicroSVG from 'public/icons/image-micro.svg';

interface ManageLayoutProps {
  children: React.ReactNode;
  /** Content for the right sidebar panel */
  sidebar: React.ReactNode;
  /** Header action buttons */
  actions?: React.ReactNode;
  /** Album detail mode - shows album title */
  albumDetail?: {
    title: string;
  };
  /** Mobile action bar content (shown when items are selected on mobile) */
  mobileActionBar?: React.ReactNode;
}

export default function ManageLayout({
  children,
  sidebar,
  actions,
  albumDetail,
  mobileActionBar,
}: ManageLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: counts } = usePhotoCounts(user?.id);
  const photoCount = counts?.photoCount ?? 0;
  const albumCount = counts?.albumCount ?? 0;

  const isPhotosActive = pathname === '/account/photos';
  const isAlbumsActive = pathname.startsWith('/account/albums');

  return (
    <div className="flex h-[calc(100svh-61px)] md:h-[calc(100svh-81px)] w-full select-none">
      {/* Left Panel - Content */}
      <div className="flex flex-1 flex-col overflow-y-auto border-r border-border-color md:border-r">
        {/* Header */}
        <div className="sticky top-0 z-20 border-b border-border-color bg-background-light px-2 py-2">
          <div className="flex items-center justify-between gap-4">
            {/* Left side: tabs + album title (if album detail) */}
            <div className="flex items-center gap-4">
              {/* Tab navigation */}
              <div className="flex">
                <Link
                  href="/account/photos"
                  className={clsx(
                    'flex items-center gap-1.5 md:gap-2 rounded-tl-full rounded-bl-full border-2 px-2 py-1.5 font-[family-name:var(--font-geist-mono)] text-sm font-medium transition-colors',
                    isPhotosActive
                      ? 'border-primary bg-primary/10 text-primary z-10'
                      : 'border-border-color-strong bg-background text-foreground hover:border-primary hover:bg-primary/5',
                  )}
                >
                  <PhotoMicroSVG className="size-4" />
                  <span className="hidden md:inline">Photos</span>
                  <div className="flex px-1 py-0.5 items-center justify-center rounded-full bg-foreground/10 text-xs">
                    {photoCount}
                  </div>
                </Link>
                <Link
                  href="/account/albums"
                  className={clsx(
                    '-ml-[2px] flex items-center gap-1.5 md:gap-2 rounded-tr-full rounded-br-full border-2 px-2 py-1.5 font-[family-name:var(--font-geist-mono)] text-sm font-medium transition-colors',
                    isAlbumsActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border-color-strong bg-background text-foreground hover:border-primary hover:bg-primary/5',
                  )}
                >
                  <FolderMicroSVG className="size-4" />
                  <span className="hidden md:inline">Albums</span>
                  <div className="flex px-1 py-0.5 items-center justify-center rounded-full bg-foreground/10 text-xs">
                    {albumCount}
                  </div>
                </Link>
              </div>

              {/* Album title (only in album detail mode - hidden on mobile) */}
              {albumDetail && (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    href="/account/albums"
                    className="flex items-center justify-center rounded-lg border border-border-color bg-background px-2 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5"
                    aria-label="Back to albums"
                  >
                    <ArrowUpLeftSVG className="size-4" />
                  </Link>
                  <h2 className="text-lg font-semibold">{albumDetail.title}</h2>
                </div>
              )}
            </div>

            {/* Actions */}
            {actions && <div className="flex gap-2 items-center">{actions}</div>}
          </div>

          {/* Mobile album detail bar - shown below main header on mobile */}
          {albumDetail && (
            <div className="flex md:hidden items-center gap-2 mt-2 px-0.5">
              <Link
                href="/account/albums"
                className="flex items-center justify-center rounded-lg border border-border-color bg-background px-2 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5"
                aria-label="Back to albums"
              >
                <ArrowUpLeftSVG className="size-4" />
              </Link>
              <h2 className="text-base font-semibold truncate">{albumDetail.title}</h2>
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex flex-1 flex-col min-h-0">
          {children}
        </div>
      </div>

      {/* Right Panel - Sidebar (hidden on mobile) */}
      <div className="hidden md:flex h-[calc(100vh-81px)] w-[400px] shrink-0 flex-col overflow-hidden bg-background-light">
        {sidebar}
      </div>

      {/* Mobile Action Bar (shown when items are selected) */}
      {mobileActionBar && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-20">
          {mobileActionBar}
        </div>
      )}
    </div>
  );
}
