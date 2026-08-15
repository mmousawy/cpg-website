'use client';

import { ManageScrollContext } from '@/context/ManageScrollContext';
import { useAuth } from '@/hooks/useAuth';
import { albumCountQueryKey, photoCountQueryKey, useAlbumCount, usePhotoCount } from '@/hooks/usePhotoCounts';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useRef, useTransition } from 'react';

import AlbumSwitcher from '@/components/manage/AlbumSwitcher';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import FolderMicroSVG from 'public/icons/folder-micro.svg';
import PhotoMicroSVG from 'public/icons/image-micro.svg';

interface ManageLayoutProps {
  children: React.ReactNode;
  /** Content for the right sidebar panel */
  sidebar: React.ReactNode;
  /** Header action buttons */
  actions?: React.ReactNode;
  /** Album detail mode - shows album title and switcher */
  albumDetail?: {
    title: string;
    slug: string;
  };
  /** Mobile action bar content (shown when items are selected on mobile) */
  mobileActionBar?: React.ReactNode;
}

function ManageTabActiveMarker({
  href,
  prefix = false,
}: {
  href: string;
  prefix?: boolean;
}) {
  const pathname = usePathname();
  const isActive = prefix ? pathname.startsWith(href) : pathname === href;
  if (!isActive) return null;

  return (
    <span
      data-active=""
      hidden
      aria-hidden
    />
  );
}

export default function ManageLayout({
  children,
  sidebar,
  actions,
  albumDetail,
  mobileActionBar,
}: ManageLayoutProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: photoCount } = usePhotoCount(user?.id);
  const { data: albumCount } = useAlbumCount(user?.id);

  const cachedPhotoCount = user?.id
    ? queryClient.getQueryData<number>(photoCountQueryKey(user.id))
    : undefined;
  const cachedAlbumCount = user?.id
    ? queryClient.getQueryData<number>(albumCountQueryKey(user.id))
    : undefined;

  const displayPhotoCount = photoCount ?? cachedPhotoCount ?? 0;
  const displayAlbumCount = albumCount ?? cachedAlbumCount ?? 0;

  const handleTabClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === window.location.pathname) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <ManageScrollContext.Provider
      value={scrollContainerRef}
    >
      <div
        className="flex flex-1 min-h-0 w-full select-none"
      >
        {/* Left Panel - Content */}
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden border-r border-border-color md:border-r"
        >
          {/* Header */}
          <div
            className="z-20 shrink-0 border-b border-border-color bg-background-light px-2 py-2"
          >
            <div
              className="flex items-center justify-between gap-4"
            >
              {/* Left side: tabs + album title (if album detail) */}
              <div
                className="flex items-center gap-4"
              >
                {/* Tab navigation */}
                <div
                  className="flex"
                >
                  <Link
                    href="/account/photos"
                    onClick={(e) => handleTabClick(e, '/account/photos')}
                    className="flex items-center gap-1.5 md:gap-2 rounded-tl-full rounded-bl-full border-2 px-2 py-1.5 font-[family-name:var(--font-geist-mono)] text-sm font-medium transition-colors border-border-color-strong bg-background text-foreground hover:border-primary hover:bg-primary/5 has-data-active:z-10 has-data-active:border-primary has-data-active:bg-primary/10 has-data-active:text-primary has-data-active:hover:border-primary has-data-active:hover:bg-primary/10"
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
                      {displayPhotoCount}
                    </div>
                    <Suspense fallback={null}>
                      <ManageTabActiveMarker
                        href="/account/photos"
                      />
                    </Suspense>
                  </Link>
                  <Link
                    href="/account/albums"
                    onClick={(e) => handleTabClick(e, '/account/albums')}
                    className="-ml-[2px] flex items-center gap-1.5 md:gap-2 rounded-tr-full rounded-br-full border-2 px-2 py-1.5 font-[family-name:var(--font-geist-mono)] text-sm font-medium transition-colors border-border-color-strong bg-background text-foreground hover:border-primary hover:bg-primary/5 has-data-active:border-primary has-data-active:bg-primary/10 has-data-active:text-primary has-data-active:hover:border-primary has-data-active:hover:bg-primary/10"
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
                      {displayAlbumCount}
                    </div>
                    <Suspense fallback={null}>
                      <ManageTabActiveMarker
                        href="/account/albums"
                        prefix
                      />
                    </Suspense>
                  </Link>
                </div>

                {/* Loading indicator during tab transition (only when not in album detail, since AlbumSwitcher has its own) */}
                {isPending && !albumDetail && (
                  <div
                    className="flex items-center"
                  >
                    <LoadingSpinner
                      size="sm"
                    />
                  </div>
              )}

                {/* Album switcher (only in album detail mode - hidden on mobile) */}
                {albumDetail && (
                  <div
                    className="hidden md:flex items-center"
                  >
                    <AlbumSwitcher
                      title={albumDetail.title}
                      slug={albumDetail.slug}
                    />
                  </div>
              )}
              </div>

              {/* Actions */}
              {actions && <div
                className="flex gap-2 items-center"
              >
                {actions}
              </div>}
            </div>

            {/* Mobile album detail bar - shown below main header on mobile */}
            {albumDetail && (
              <div
                className="flex md:hidden items-center mt-2 px-0.5"
              >
                <AlbumSwitcher
                  title={albumDetail.title}
                  slug={albumDetail.slug}
                  compact
                />
              </div>
          )}
          </div>

          {/* Content area — this is the scroll container for infinite scroll sentinels */}
          <div
            ref={scrollContainerRef}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          >
            {children}
          </div>
        </div>

        {/* Right Panel - Sidebar (hidden on mobile). min-h-0 prevents content from expanding past the viewport. */}
        <div
          className="hidden md:flex w-[400px] shrink-0 min-h-0 flex-col overflow-hidden bg-background-light"
        >
          {sidebar}
        </div>

        {/* Mobile Action Bar (shown when items are selected) */}
        {mobileActionBar && (
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-20"
          >
            {mobileActionBar}
          </div>
      )}
      </div>
    </ManageScrollContext.Provider>
  );
}
