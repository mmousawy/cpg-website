'use client';

import BlurImage from '@/components/shared/BlurImage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Popover from '@/components/shared/Popover';
import { useAlbums } from '@/hooks/useAlbums';
import { useAuth } from '@/hooks/useAuth';
import type { AlbumWithPhotos } from '@/types/albums';
import { getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ArrowDownShortSVG from 'public/icons/arrow-down-short.svg';
import ArrowUpLeftSVG from 'public/icons/arrow-up-left-micro.svg';
import FolderSVG from 'public/icons/folder.svg';
import { useCallback, useState, useTransition } from 'react';

interface AlbumSwitcherProps {
  /** Current album title */
  title: string;
  /** Current album slug (to highlight in the list) */
  slug: string;
  /** Compact mode for mobile */
  compact?: boolean;
}

export default function AlbumSwitcher({ title, slug, compact = false }: AlbumSwitcherProps) {
  const { user } = useAuth();
  const { data: albums, isLoading: albumsLoading } = useAlbums(user?.id);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = useCallback((targetSlug: string) => {
    if (targetSlug === slug) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    startTransition(() => {
      router.push(`/account/albums/${targetSlug}`);
    });
  }, [slug, router]);

  const handleBackToAlbums = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(() => {
      router.push('/account/albums');
    });
  }, [router]);

  const isNavigating = isPending;

  // Sort albums alphabetically — stable order that doesn't shuffle on navigation
  const sortedAlbums = (albums || []).slice().sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  const getCoverUrl = (album: AlbumWithPhotos) =>
    album.cover_image_url || album.photos?.[0]?.photo_url || null;

  return (
    <div
      className="flex items-center gap-2"
    >
      {/* Back button — separate from the switcher */}
      <Link
        href="/account/albums"
        onClick={handleBackToAlbums}
        className="flex items-center justify-center rounded-lg border border-border-color bg-background px-2 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5"
        aria-label="Back to albums"
      >
        {isNavigating ? (
          <LoadingSpinner
            size="sm"
          />
        ) : (
          <ArrowUpLeftSVG
            className="size-4"
          />
        )}
      </Link>

      {/* Title + dropdown switcher */}
      <Popover
        open={isOpen}
        onOpenChange={setIsOpen}
        align="left"
        width="w-72"
        className="max-h-80 overflow-y-auto"
        trigger={
          <div
            className={clsx(
              'inline-flex! items-center gap-0.5 rounded-md px-1.5 pr-0.5 py-0.5 transition-colors cursor-pointer border border-transparent',
              isOpen
                ? 'bg-foreground/5 border-border-color-strong!'
                : 'hover:bg-foreground/5 border-bg-foreground/5',
            )}
          >
            <h2
              className={clsx(
                'font-semibold truncate',
                compact ? 'text-base max-w-40' : 'text-base max-w-52',
              )}
            >
              {title}
            </h2>
            <ArrowDownShortSVG
              className={clsx(
                'size-5 shrink-0 opacity-70 transition-transform mt-0.5',
                isOpen && 'rotate-180 opacity-70',
              )}
            />
          </div>
        }
      >
        {/* Album list */}
        {albumsLoading ? (
          <div
            className="flex items-center justify-center py-6"
          >
            <LoadingSpinner
              size="sm"
            />
          </div>
        ) : sortedAlbums.length === 0 ? (
          <div
            className="px-3 py-4 text-center text-sm text-foreground/50"
          >
            No albums found
          </div>
        ) : (
          <div
            className="p-1.5"
          >
            {sortedAlbums.map((album) => {
              const isCurrent = album.slug === slug;
              const coverUrl = getCoverUrl(album);
              const photoCount = album.photos?.length || 0;

              return (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => handleNavigate(album.slug)}
                  className={clsx(
                    'flex w-full items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 text-sm transition-colors rounded-sm',
                    isCurrent
                      ? 'bg-primary/10 dark:bg-foreground/5 text-primary shadow-[inset_0_0_0_1px_#38786052] dark:shadow-[inset_0_0_0_1px_#ededed1c]'
                      : 'hover:bg-background',
                  )}
                >
                  {/* Album thumbnail */}
                  <div
                    className="relative size-8 shrink-0 overflow-hidden rounded bg-background-medium"
                  >
                    {coverUrl ? (
                      <BlurImage
                        src={getSquareThumbnailUrl(coverUrl, 64, 75) || coverUrl}
                        alt={album.title}
                        blurhash={album.cover_image_blurhash}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className="flex size-full items-center justify-center"
                      >
                        <FolderSVG
                          className="size-4 text-foreground/20"
                        />
                      </div>
                    )}
                  </div>

                  {/* Album info */}
                  <div
                    className="min-w-0 flex-1 text-left"
                  >
                    <p
                      className={clsx(
                        'truncate text-sm leading-tight',
                        isCurrent ? 'font-semibold' : 'font-medium',
                      )}
                    >
                      {album.title}
                    </p>
                    <p
                      className="text-xs text-foreground/50"
                    >
                      {photoCount}
                      {' '}
                      {photoCount === 1 ? 'photo' : 'photos'}
                    </p>
                  </div>

                  {/* Current indicator */}
                  {isCurrent && (
                    <div
                      className="size-1.5 shrink-0 rounded-full bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Popover>
    </div>
  );
}
