'use client';

import BlurImage from '@/components/shared/BlurImage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Popover from '@/components/shared/Popover';
import { useAlbumSectionCounts, useAllEventAlbums, usePersonalAlbums, useSharedWithMeAlbums, useYourSharedAlbums, type SharedWithMeAlbum } from '@/hooks/useAlbums';
import { useAuth } from '@/hooks/useAuth';
import type { AlbumWithPhotos } from '@/types/albums';
import { getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ArrowDownShortSVG from 'public/icons/arrow-down-short.svg';
import ArrowUpLeftSVG from 'public/icons/arrow-up-left-micro.svg';
import ChevronDownSVG from 'public/icons/chevron-down.svg';
import FolderSVG from 'public/icons/folder.svg';
import { useCallback, useMemo, useState, useTransition } from 'react';

interface AlbumSwitcherProps {
  /** Current album title */
  title: string;
  /** Current album slug (to highlight in the list) */
  slug: string;
  /** Compact mode for mobile */
  compact?: boolean;
}

type SwitcherAlbum = AlbumWithPhotos & {
  owner_profile?: SharedWithMeAlbum['owner_profile'];
};

export default function AlbumSwitcher({ title, slug, compact = false }: AlbumSwitcherProps) {
  const { user } = useAuth();
  const [expandedOnce, setExpandedOnce] = useState<Record<string, boolean>>({});

  // Personal and Your shared albums load eagerly (not collapsed by default)
  // Shared with me and Event albums load lazily when expanded
  const { data: sectionCounts } = useAlbumSectionCounts(user?.id);
  const { data: personalAlbumsRaw = [], isLoading: personalLoading } = usePersonalAlbums(user?.id);
  const { data: yourSharedAlbumsRaw = [] } = useYourSharedAlbums(user?.id);
  const { data: sharedWithMeAlbums = [] } = useSharedWithMeAlbums(user?.id);
  const { data: allEventAlbumsRaw = [] } = useAllEventAlbums(user?.id, !!expandedOnce.event);

  const albumsLoading = personalLoading;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = useCallback((album: SwitcherAlbum) => {
    if (album.slug === slug) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    const ownerNickname = album.owner_profile?.nickname;
    const href = ownerNickname
      ? `/account/albums/${album.slug}?owner=${encodeURIComponent(ownerNickname)}`
      : `/account/albums/${album.slug}`;
    startTransition(() => {
      router.push(href);
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

  const sortByDate = useCallback(
    (a: SwitcherAlbum, b: SwitcherAlbum) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.id.localeCompare(b.id);
    },
    [],
  );

  const personalAlbums = useMemo(
    () => [...personalAlbumsRaw].sort(sortByDate),
    [personalAlbumsRaw, sortByDate],
  );
  const yourSharedAlbums = useMemo(
    () => [...yourSharedAlbumsRaw].sort(sortByDate),
    [yourSharedAlbumsRaw, sortByDate],
  );
  const eventAlbums = useMemo(
    () => [...allEventAlbumsRaw].sort(sortByDate),
    [allEventAlbumsRaw, sortByDate],
  );
  const sortedSharedWithMe = useMemo(
    () => [...sharedWithMeAlbums].sort(sortByDate) as SwitcherAlbum[],
    [sharedWithMeAlbums, sortByDate],
  );

  const sections = useMemo(() => {
    const result: Array<{ key: string; label: string; albums: SwitcherAlbum[]; count: number | undefined; collapsible: boolean }> = [];
    const personalCount = personalAlbums.length > 0 ? personalAlbums.length : sectionCounts?.personal;
    const sharedCount = yourSharedAlbums.length > 0 ? yourSharedAlbums.length : sectionCounts?.shared;
    const sharedWithMeCount = sortedSharedWithMe.length > 0 ? sortedSharedWithMe.length : sectionCounts ? ((sectionCounts.sharedWithMe ?? 0) + (sectionCounts.pendingInvites ?? 0)) : undefined;
    const eventCount = eventAlbums.length > 0 ? eventAlbums.length : sectionCounts?.allEvent;

    // Always show all sections
    result.push({ key: 'personal', label: 'Your albums', albums: personalAlbums, count: personalCount, collapsible: false });
    result.push({ key: 'shared', label: 'Your shared albums', albums: yourSharedAlbums, count: sharedCount, collapsible: false });
    result.push({ key: 'sharedWithMe', label: 'Shared with you', albums: sortedSharedWithMe, count: sharedWithMeCount, collapsible: true });
    result.push({ key: 'event', label: 'Event albums', albums: eventAlbums, count: eventCount, collapsible: true });
    return result;
  }, [personalAlbums, yourSharedAlbums, sortedSharedWithMe, eventAlbums, sectionCounts]);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({ event: true });
  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const willExpand = !!prev[key];
      if (willExpand) {
        setExpandedOnce((e) => (e[key] ? e : { ...e, [key]: true }));
      }
      return { ...prev, [key]: !prev[key] };
    });
  }, []);

  const getCoverUrl = (album: SwitcherAlbum) =>
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
        ) : sections.length === 0 ? (
          <div
            className="px-3 py-4 text-center text-sm text-foreground/50"
          >
            No albums found
          </div>
        ) : (
          <div
            className="p-1.5"
          >
            {sections.map((section, sectionIdx) => {
              const isCollapsed = !!collapsedSections[section.key];
              return (
                <div
                  key={section.key}
                >
                  {(sections.length > 1) && (() => {
                    const isEmpty = section.count != null && section.count === 0;
                    const canExpand = section.collapsible && !isEmpty;
                    return canExpand ? (
                      <button
                        type="button"
                        onClick={() => toggleSection(section.key)}
                        className={clsx(
                          'flex w-full items-center justify-between px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/40 cursor-pointer hover:text-foreground/60',
                          sectionIdx > 0 ? 'mt-1 pt-2.5 border-t border-border-color' : 'pt-1',
                        )}
                      >
                        <span>
                          {section.label}
                          {section.count != null && ` (${section.count})`}
                        </span>
                        <ChevronDownSVG
                          className={clsx(
                            'size-3 transition-transform duration-200',
                            isCollapsed && '-rotate-90',
                          )}
                        />
                      </button>
                    ) : (
                      <div
                        className={clsx(
                          'px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/40',
                          sectionIdx > 0 ? 'mt-1 pt-2.5 border-t border-border-color' : 'pt-1',
                        )}
                      >
                        {section.label}
                        {section.count != null && ` (${section.count})`}
                      </div>
                    );
                  })()}
                  {!isCollapsed && section.albums.map((album) => {
                    const isCurrent = album.slug === slug;
                    const coverUrl = getCoverUrl(album);
                    const photoCount = album.photos?.length || 0;

                    return (
                      <button
                        key={album.id}
                        type="button"
                        onClick={() => handleNavigate(album)}
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
              );
            })}
          </div>
        )}
      </Popover>
    </div>
  );
}
