'use client';

import { useManage } from '@/context/ManageContext';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import ArrowLeftSVG from 'public/icons/arrow-left.svg';
import FolderSVG from 'public/icons/folder.svg';
import ImageSVG from 'public/icons/image.svg';

interface ManageLayoutProps {
  children: React.ReactNode;
  /** Content for the right sidebar panel */
  sidebar: React.ReactNode;
  /** Header action buttons */
  actions?: React.ReactNode;
  /** Album detail mode - shows back button and album title */
  albumDetail?: {
    title: string;
    backHref?: string;
  };
}

export default function ManageLayout({
  children,
  sidebar,
  actions,
  albumDetail,
}: ManageLayoutProps) {
  const pathname = usePathname();
  const { photoCount, albumCount } = useManage();

  const isPhotosActive = pathname === '/account/photos';
  const isAlbumsActive = pathname.startsWith('/account/albums');

  return (
    <div className="flex h-[calc(100svh-81px)] w-full select-none">
      {/* Left Panel - Content */}
      <div className="flex flex-1 flex-col overflow-y-auto border-r border-border-color">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border-color bg-background px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left side: Back button (if album detail) + tabs + album title (if album detail) */}
            <div className="flex items-center gap-4">
              {albumDetail && (
                <Link
                  href={albumDetail.backHref || '/account/albums'}
                  className="flex items-center gap-2 rounded-lg border border-border-color bg-background-light px-3 py-2 text-sm font-medium transition-colors hover:border-border-color-strong hover:bg-background"
                >
                  <ArrowLeftSVG className="size-4" />
                  Back
                </Link>
              )}

              {/* Tab navigation */}
              <div className="flex gap-1 rounded-lg border border-border-color bg-background-light p-1">
                <Link
                  href="/account/photos"
                  className={clsx(
                    'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    isPhotosActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-foreground/70 hover:text-foreground',
                  )}
                >
                  <ImageSVG className="size-4" />
                  Photos ({photoCount})
                </Link>
                {albumDetail ? (
                  // In album detail mode, Albums tab shows as active but not clickable
                  <div className="flex items-center gap-2 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                    <FolderSVG className="size-4" />
                    Albums ({albumCount})
                  </div>
                ) : (
                  <Link
                    href="/account/albums"
                    className={clsx(
                      'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                      isAlbumsActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-foreground/70 hover:text-foreground',
                    )}
                  >
                    <FolderSVG className="size-4" />
                    Albums ({albumCount})
                  </Link>
                )}
              </div>

              {/* Album title (only in album detail mode) */}
              {albumDetail && (
                <h2 className="text-lg font-semibold">{albumDetail.title}</h2>
              )}
            </div>

            {/* Actions */}
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </div>

        {/* Content area */}
        <div className="flex flex-1 flex-col min-h-0">{children}</div>
      </div>

      {/* Right Panel - Sidebar */}
      <div className="flex h-[calc(100vh-81px)] w-[400px] shrink-0 flex-col overflow-hidden bg-background-light">
        {sidebar}
      </div>
    </div>
  );
}
