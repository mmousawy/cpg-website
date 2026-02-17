'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import {
  AlbumEditSidebar,
  AlbumGrid,
  type AlbumFormData,
  type BulkAlbumFormData,
} from '@/components/manage';
import ManageLayout from '@/components/manage/ManageLayout';
import MobileActionBar from '@/components/manage/MobileActionBar';
import type { SharedAlbumFormData } from '@/components/manage/SharedAlbumEditForm';
import SidebarPanel from '@/components/manage/SidebarPanel';
import BottomSheet from '@/components/shared/BottomSheet';
import Button from '@/components/shared/Button';
import HelpLink from '@/components/shared/HelpLink';
import PageLoading from '@/components/shared/PageLoading';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';
import {
  useBulkUpdateAlbums,
  useCreateAlbum,
  useDeleteAlbums,
  useUpdateAlbum,
} from '@/hooks/useAlbumMutations';
import type { PendingAlbumInvite, SharedWithMeAlbum } from '@/hooks/useAlbums';
import { useAlbumSectionCounts, useAllEventAlbums, usePendingAlbumInvites, usePersonalAlbums, useSharedWithMeAlbums, useYourSharedAlbums } from '@/hooks/useAlbums';
import { useAuth } from '@/hooks/useAuth';
import { confirmDeleteAlbums, confirmUnsavedChanges } from '@/utils/confirmHelpers';
import { supabase } from '@/utils/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import Avatar from '@/components/auth/Avatar';
import BlurImage from '@/components/shared/BlurImage';
import CardBadges from '@/components/shared/CardBadges';
import { getCroppedThumbnailUrl } from '@/utils/supabaseImageLoader';

import UsersMicroSVG from 'public/icons/users-micro.svg';

import ChevronDownSVG from 'public/icons/chevron-down.svg';
import ClockMiniSVG from 'public/icons/clock-mini.svg';
import FolderAddMiniSVG from 'public/icons/folder-add-mini.svg';
import FolderOpenMiniSVG from 'public/icons/folder-open-mini.svg';
import FolderSVG from 'public/icons/folder.svg';
import TrashSVG from 'public/icons/trash.svg';

export default function AlbumsPage() {
  const { user, profile, isAdmin } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();

  const albumEditDirtyRef = useRef(false);
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const [isMobileEditSheetOpen, setIsMobileEditSheetOpen] = useState(false);
  const [isNewAlbum, setIsNewAlbum] = useState(false);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(new Set());
  const [selectedSharedAlbumId, setSelectedSharedAlbumId] = useState<string | null>(null);
  const [selectedPendingInviteId, setSelectedPendingInviteId] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    eventAlbums: true,
  });

  // Track which sections have been opened at least once (for lazy loading)
  const [expandedOnce, setExpandedOnce] = useState<Record<string, boolean>>({});

  // Lightweight counts — always fetched eagerly for accurate section headers
  const { data: sectionCounts } = useAlbumSectionCounts(user?.id);

  // React Query hooks — each section loads lazily when expanded
  const personalExpanded = !collapsedSections.personalAlbums || !!expandedOnce.personalAlbums;
  const sharedExpanded = !collapsedSections.yourSharedAlbums || !!expandedOnce.yourSharedAlbums;
  const sharedWithYouExpanded = !collapsedSections.sharedWithYou || !!expandedOnce.sharedWithYou;
  const eventExpanded = !!expandedOnce.eventAlbums;

  const { data: personalAlbumsData = [], isLoading: personalLoading } = usePersonalAlbums(user?.id, personalExpanded);
  const { data: yourSharedAlbumsData = [], isLoading: sharedAlbumsLoading } = useYourSharedAlbums(user?.id, sharedExpanded);
  const { data: sharedWithMeAlbums = [], isLoading: sharedWithMeLoading } = useSharedWithMeAlbums(user?.id, sharedWithYouExpanded);
  const { data: pendingInvites = [], isLoading: pendingInvitesLoading } = usePendingAlbumInvites(user?.id, sharedWithYouExpanded);
  const { data: allEventAlbumsData = [], isLoading: eventAlbumsLoading } = useAllEventAlbums(user?.id, eventExpanded);
  const createAlbumMutation = useCreateAlbum(user?.id, profile?.nickname);
  const updateAlbumMutation = useUpdateAlbum(user?.id, profile?.nickname);
  const bulkUpdateAlbumsMutation = useBulkUpdateAlbums(user?.id, profile?.nickname);
  const deleteAlbumsMutation = useDeleteAlbums(user?.id, profile?.nickname);

  // Sync dirty state with global unsaved changes context
  const handleDirtyChange = useCallback(
    (isDirty: boolean) => {
      albumEditDirtyRef.current = isDirty;
      setHasUnsavedChanges(isDirty);
    },
    [setHasUnsavedChanges],
  );

  const toggleSection = useCallback((section: string) => {
    setCollapsedSections((prev) => {
      const willExpand = !!prev[section];
      if (willExpand) {
        setExpandedOnce((e) => (e[section] ? e : { ...e, [section]: true }));
      }
      return { ...prev, [section]: !prev[section] };
    });
  }, []);

  // Clear unsaved changes on unmount
  useEffect(() => {
    return () => setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  const handleConfirmUnsavedChanges = useCallback(async (): Promise<boolean> => {
    if (!albumEditDirtyRef.current) return true;
    const confirmed = await confirm(confirmUnsavedChanges());
    if (confirmed) {
      albumEditDirtyRef.current = false;
      setHasUnsavedChanges(false);
    }
    return confirmed;
  }, [confirm, setHasUnsavedChanges]);

  const handleAlbumDoubleClick = async (album: typeof personalAlbums[0]) => {
    if (!(await handleConfirmUnsavedChanges())) return;
    router.push(`/account/albums/${album.slug}`);
  };

  const handleSelectAlbum = async (albumId: string, isMultiSelect: boolean) => {
    // Check for unsaved changes when switching to a different single selection
    if (!isMultiSelect && albumEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) {
      return;
    }
    // Close new album form when selecting an existing album
    if (isNewAlbum) {
      setIsNewAlbum(false);
    }
    // Clear shared album / pending invite selection when selecting an owned album
    setSelectedSharedAlbumId(null);
    setSelectedPendingInviteId(null);
    setSelectedAlbumIds((prev) => {
      const newSet = new Set(prev);
      if (isMultiSelect) {
        if (newSet.has(albumId)) {
          newSet.delete(albumId);
        } else {
          newSet.add(albumId);
        }
      } else {
        newSet.clear();
        newSet.add(albumId);
      }
      return newSet;
    });
  };

  const handleSelectSharedAlbum = async (albumId: string) => {
    if (albumEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) {
      return;
    }
    if (isNewAlbum) {
      setIsNewAlbum(false);
    }
    setSelectedAlbumIds(new Set());
    setSelectedPendingInviteId(null);
    setSelectedSharedAlbumId((prev) => (prev === albumId ? null : albumId));
  };

  const handleSharedAlbumDoubleClick = (album: SharedWithMeAlbum) => {
    // Ensure the album stays selected on double-click (first click may toggle off)
    setSelectedSharedAlbumId(album.id);
    const nickname = album.owner_profile?.nickname;
    if (nickname) {
      router.push(`/account/albums/${album.slug}?owner=${encodeURIComponent(nickname)}`);
    }
  };

  const handleClearSelection = async () => {
    if (albumEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) return;
    setSelectedAlbumIds(new Set());
    setSelectedSharedAlbumId(null);
    setSelectedPendingInviteId(null);
    if (isNewAlbum) {
      setIsNewAlbum(false);
    }
  };

  const handleSelectMultiple = async (ids: string[]) => {
    if (albumEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) return;
    setSelectedAlbumIds(new Set(ids));
    if (isNewAlbum) {
      setIsNewAlbum(false);
    }
  };

  const handleCreateNewAlbum = async () => {
    if (!isNewAlbum && !(await handleConfirmUnsavedChanges())) return;
    setSelectedAlbumIds(new Set());
    setSelectedSharedAlbumId(null);
    setSelectedPendingInviteId(null);
    setIsNewAlbum(true);
    if (window.matchMedia('(max-width: 767px)').matches) {
      setIsMobileEditSheetOpen(true);
    }
  };

  const handleCreateAlbum = async (data: AlbumFormData | SharedAlbumFormData) => {
    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(false);
    const newAlbum = await createAlbumMutation.mutateAsync(data);
    setIsNewAlbum(false);
    router.push(`/account/albums/${newAlbum.slug}`);
  };

  const handleSaveAlbum = async (albumId: string, data: AlbumFormData | SharedAlbumFormData) => {
    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(false);
    await updateAlbumMutation.mutateAsync({ albumId, data });
  };

  const handleBulkSaveAlbums = async (albumIds: string[], data: BulkAlbumFormData) => {
    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(false);
    await bulkUpdateAlbumsMutation.mutateAsync({ albumIds, data });
  };

  const handleDeleteAlbum = async (albumId: string) => {
    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(false);

    await deleteAlbumsMutation.mutateAsync([albumId]);

    // Clear selection if deleting a selected album
    setSelectedAlbumIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(albumId);
      return newSet;
    });
  };

  const handleBulkDeleteAlbums = async (albumIds: string[]) => {
    if (albumIds.length === 0) return;

    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(false);

    await deleteAlbumsMutation.mutateAsync(albumIds);

    setSelectedAlbumIds(new Set());
  };

  // Stable sort: newest first, with id tiebreaker
  const sortByDate = useCallback(
    <T extends { created_at: string | null; id: string }>(a: T, b: T) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.id.localeCompare(b.id);
    },
    [],
  );

  // Sort fetched data (eslint-disable: React Compiler cannot preserve .sort() memoization)
  /* eslint-disable react-hooks/preserve-manual-memoization */
  const personalAlbums = useMemo(
    () => [...personalAlbumsData].sort(sortByDate),
    [personalAlbumsData, sortByDate],
  );
  const yourSharedAlbums = useMemo(
    () => [...yourSharedAlbumsData].sort(sortByDate),
    [yourSharedAlbumsData, sortByDate],
  );
  const eventAlbums = useMemo(
    () => [...allEventAlbumsData].sort(sortByDate),
    [allEventAlbumsData, sortByDate],
  );
  const sortedSharedWithMeAlbums = useMemo(
    () => [...sharedWithMeAlbums].sort(sortByDate),
    [sharedWithMeAlbums, sortByDate],
  );
  /* eslint-enable react-hooks/preserve-manual-memoization */

  // All sections are always visible so users can see counts even when empty

  const albumsLoading = personalLoading;

  const allOwnedAlbums = useMemo(
    () => [...personalAlbumsData, ...yourSharedAlbumsData, ...allEventAlbumsData],
    [personalAlbumsData, yourSharedAlbumsData, allEventAlbumsData],
  );
  const selectedAlbums = allOwnedAlbums.filter((a) => selectedAlbumIds.has(a.id));
  const selectedSharedAlbum = sharedWithMeAlbums.find((a) => a.id === selectedSharedAlbumId) ?? null;
  const selectedPendingInvite = pendingInvites.find((i) => i.requestId === selectedPendingInviteId) ?? null;
  const selectedCount = selectedAlbumIds.size;

  const handleSelectPendingInvite = (requestId: number) => {
    setSelectedAlbumIds(new Set());
    setSelectedSharedAlbumId(null);
    if (isNewAlbum) {
      setIsNewAlbum(false);
    }
    setSelectedPendingInviteId((prev) => (prev === requestId ? null : requestId));
  };

  const handleMobileEdit = () => {
    // Only open on mobile (below md breakpoint)
    if (window.matchMedia('(max-width: 767px)').matches) {
      setIsMobileEditSheetOpen(true);
    }
  };

  const handleMobileEditClose = async () => {
    if (albumEditDirtyRef.current && !(await handleConfirmUnsavedChanges())) {
      return;
    }
    setIsMobileEditSheetOpen(false);
  };

  const handleMobileBulkDelete = async () => {
    if (selectedCount === 0) return;

    const confirmed = await confirm(confirmDeleteAlbums(selectedAlbums, selectedCount));
    if (!confirmed) return;
    await handleBulkDeleteAlbums(Array.from(selectedAlbumIds));
  };

  return (
    <>
      <ManageLayout
        actions={
          <>
            <HelpLink
              href="manage-albums"
              label="How to manage albums"
            />
            <Button
              onClick={handleCreateNewAlbum}
              icon={<FolderAddMiniSVG
                className="size-5 -ml-0.5"
              />}
              variant="primary"
            >
              <span
                className="hidden md:inline-block"
              >
                New album
              </span>
            </Button>
          </>
        }
        sidebar={
          selectedPendingInvite ? (
            <PendingInviteSidebar
              invite={selectedPendingInvite}
              userId={user?.id}
              onResolved={() => setSelectedPendingInviteId(null)}
            />
          ) : selectedSharedAlbum ? (
            <SidebarPanel
              title="Album details"
            >
              <div
                className="space-y-4"
              >
                <div>
                  <h3
                    className="text-lg font-semibold"
                  >
                    {selectedSharedAlbum.title}
                  </h3>
                  {selectedSharedAlbum.description && (
                    <p
                      className="mt-1 text-sm text-foreground/70"
                    >
                      {selectedSharedAlbum.description}
                    </p>
                  )}
                </div>
                <div
                  className="text-sm text-foreground/60 space-y-2"
                >
                  {selectedSharedAlbum.owner_profile && (
                    <div
                      className="flex items-center gap-1.5"
                    >
                      <Avatar
                        avatarUrl={selectedSharedAlbum.owner_profile?.avatar_url}
                        fullName={selectedSharedAlbum.owner_profile?.full_name}
                        size="xxs"
                      />
                      <span
                        className="text-foreground/80 font-medium"
                      >
                        @
                        {selectedSharedAlbum.owner_profile?.nickname || selectedSharedAlbum.owner_profile?.full_name || 'Unknown'}
                      </span>
                    </div>
                  )}
                  <p>
                    {selectedSharedAlbum.photos?.length || 0}
                    {' '}
                    {(selectedSharedAlbum.photos?.length || 0) === 1 ? 'photo' : 'photos'}
                  </p>
                </div>
                <div
                  className="pt-2 border-t border-border-color text-xs text-foreground/50"
                >
                  You are a member of this shared album. Double-click to open.
                </div>
              </div>
            </SidebarPanel>
          ) : (
            <AlbumEditSidebar
              selectedAlbums={selectedAlbums}
              isNewAlbum={isNewAlbum}
              nickname={profile?.nickname}
              onSave={handleSaveAlbum}
              onBulkSave={handleBulkSaveAlbums}
              onDelete={handleDeleteAlbum}
              onBulkDelete={handleBulkDeleteAlbums}
              onCreate={handleCreateAlbum}
              isLoading={albumsLoading && personalAlbums.length === 0}
              onDirtyChange={handleDirtyChange}
            />
        )
        }
        mobileActionBar={
          <MobileActionBar
            selectedCount={selectedCount}
            onEdit={handleMobileEdit}
            onClearSelection={handleClearSelection}
            actions={
              <>
                {selectedCount > 0 && (
                  <Button
                    onClick={handleMobileBulkDelete}
                    variant="danger"
                    size="sm"
                    icon={<TrashSVG
                      className="size-5 -ml-0.5"
                    />}
                  >
                    <span
                      className="hidden md:inline-block"
                    >
                      Delete
                    </span>
                  </Button>
                )}
                {selectedCount === 1 && (
                  <Button
                    onClick={() => {
                      const album = selectedAlbums[0];
                      if (album) router.push(`/account/albums/${album.slug}`);
                    }}
                    variant="secondary"
                    size="sm"
                    icon={<FolderOpenMiniSVG
                      className="size-5 -ml-0.5"
                    />}
                  >
                    <span
                      className="hidden md:inline-block"
                    >
                      Open
                    </span>
                  </Button>
                )}
              </>
            }
          />
        }
      >
        {albumsLoading && personalAlbums.length === 0 ? (
          <PageLoading
            message="Loading albums..."
          />
        ) : personalAlbums.length === 0 && yourSharedAlbums.length === 0 && sharedWithMeAlbums.length === 0 ? (
          <div
            className="border-2 border-dashed border-border-color p-12 text-center m-4 h-full flex flex-col items-center justify-center"
          >
            <FolderSVG
              className="size-10 mb-2 inline-block"
            />
            <p
              className="mb-2 text-lg opacity-70"
            >
              You don&apos;t have any albums yet
            </p>
            <p
              className="text-sm text-foreground/50 mb-4"
            >
              Use the &quot;New album&quot; button to create a new album
            </p>
            <Button
              onClick={handleCreateNewAlbum}
              icon={<FolderAddMiniSVG
                className="size-5 -ml-0.5"
              />}
            >
              New album
            </Button>
          </div>
        ) : (
          <div
            className="flex flex-col min-h-0 flex-1 overflow-y-auto"
          >
            <AlbumSection
              title="Your albums"
              count={personalAlbums.length > 0 ? personalAlbums.length : sectionCounts?.personal}
              isCollapsed={!!collapsedSections.personalAlbums}
              isLoading={personalLoading && personalAlbums.length === 0}
              onToggle={() => toggleSection('personalAlbums')}
            >
              <AlbumGrid
                albums={personalAlbums}
                selectedAlbumIds={selectedAlbumIds}
                onAlbumDoubleClick={handleAlbumDoubleClick}
                onSelectAlbum={handleSelectAlbum}
                onClearSelection={handleClearSelection}
                onSelectMultiple={handleSelectMultiple}
                reducedTopPadding
              />
            </AlbumSection>

            <AlbumSection
              title="Your shared albums"
              count={yourSharedAlbums.length > 0 ? yourSharedAlbums.length : sectionCounts?.shared}
              isCollapsed={!!collapsedSections.yourSharedAlbums}
              isLoading={sharedAlbumsLoading && yourSharedAlbums.length === 0}
              onToggle={() => toggleSection('yourSharedAlbums')}
              borderTop
            >
              <AlbumGrid
                albums={yourSharedAlbums}
                selectedAlbumIds={selectedAlbumIds}
                onAlbumDoubleClick={handleAlbumDoubleClick}
                onSelectAlbum={handleSelectAlbum}
                onClearSelection={handleClearSelection}
                onSelectMultiple={handleSelectMultiple}
                reducedTopPadding
              />
            </AlbumSection>

            <AlbumSection
              title="Shared with you"
              count={(sharedWithMeAlbums.length + pendingInvites.length) > 0 ? (sharedWithMeAlbums.length + pendingInvites.length) : sectionCounts ? ((sectionCounts.sharedWithMe ?? 0) + (sectionCounts.pendingInvites ?? 0)) : undefined}
              isCollapsed={!!collapsedSections.sharedWithYou}
              isLoading={(sharedWithMeLoading || pendingInvitesLoading) && (sharedWithMeAlbums.length + pendingInvites.length) === 0}
              onToggle={() => toggleSection('sharedWithYou')}
              borderTop
            >
              <SharedWithYouGrid
                pendingInvites={pendingInvites}
                albums={sortedSharedWithMeAlbums}
                selectedPendingInviteId={selectedPendingInviteId}
                selectedAlbumId={selectedSharedAlbumId}
                onSelectInvite={handleSelectPendingInvite}
                onSelectAlbum={handleSelectSharedAlbum}
                onDoubleClickAlbum={handleSharedAlbumDoubleClick}
              />
            </AlbumSection>

            <AlbumSection
              title="Event albums"
              count={eventAlbums.length > 0 ? eventAlbums.length : sectionCounts?.allEvent}
              isCollapsed={!!collapsedSections.eventAlbums}
              isLoading={eventAlbumsLoading && eventAlbums.length === 0}
              onToggle={() => toggleSection('eventAlbums')}
              borderTop
              isLast
            >
              <AlbumGrid
                albums={eventAlbums}
                selectedAlbumIds={selectedAlbumIds}
                onAlbumDoubleClick={handleAlbumDoubleClick}
                onSelectAlbum={handleSelectAlbum}
                onClearSelection={handleClearSelection}
                onSelectMultiple={handleSelectMultiple}
                reducedTopPadding
              />
            </AlbumSection>
          </div>
        )}
      </ManageLayout>

      {/* Mobile Edit Sheet */}
      <BottomSheet
        isOpen={isMobileEditSheetOpen}
        onClose={handleMobileEditClose}
        title={
          isNewAlbum
            ? 'New album'
            : selectedAlbums.length === 0
              ? undefined
              : selectedAlbums.length === 1
                ? 'Edit album'
                : `Edit ${selectedAlbums.length} albums`
        }
      >
        <AlbumEditSidebar
          selectedAlbums={selectedAlbums}
          isNewAlbum={isNewAlbum}
          nickname={profile?.nickname}
          onSave={handleSaveAlbum}
          onBulkSave={handleBulkSaveAlbums}
          onDelete={handleDeleteAlbum}
          onBulkDelete={handleBulkDeleteAlbums}
          onCreate={handleCreateAlbum}
          isLoading={albumsLoading}
          onDirtyChange={handleDirtyChange}
          hideTitle
        />
      </BottomSheet>
    </>
  );
}

function AlbumSection({
  title,
  count,
  isCollapsed,
  isLoading,
  onToggle,
  borderTop,
  isLast,
  children,
}: {
  title: string;
  count?: number;
  isCollapsed: boolean;
  isLoading?: boolean;
  onToggle: () => void;
  borderTop?: boolean;
  isLast?: boolean;
  children: React.ReactNode;
}) {
  const isEmpty = count != null && count === 0;

  return (
    <div
      className={`${borderTop ? 'border-t border-border-color-strong' : ''} ${isLast && isCollapsed ? 'border-b border-border-color-strong' : ''}`}
    >
      <button
        type="button"
        onClick={isEmpty ? undefined : onToggle}
        className={`flex w-full items-center justify-between gap-2 px-4 sm:px-6 py-4 sticky top-0 z-20 transition-colors duration-200 ${!isCollapsed && !isEmpty ? 'bg-background-light shadow-[0_1px_0_0_var(--border-color-strong)] hover:bg-background-light' : 'bg-background hover:bg-background-medium'} ${isEmpty ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <h3
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-foreground/80"
        >
          {title}
          {count != null && (
            <span
              className="text-foreground/50"
            >
              (
              {count}
              )
            </span>
          )}
          {isLoading && (
            <span
              className="inline-block size-3 animate-spin rounded-full border-[1.5px] border-foreground/30 border-t-transparent"
            />
          )}
        </h3>
        {!isEmpty && (
          <ChevronDownSVG
            className={`size-4 text-foreground/70 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}
          />
        )}
      </button>
      <CollapsibleContent
        isCollapsed={isCollapsed}
      >
        {children}
      </CollapsibleContent>
    </div>
  );
}

function CollapsibleContent({
  isCollapsed,
  children,
}: {
  isCollapsed: boolean;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevCollapsed = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const isInitial = prevCollapsed.current === null;
    const changed = prevCollapsed.current !== isCollapsed;
    prevCollapsed.current = isCollapsed;

    if (isInitial || !changed) {
      // First render or no change: set state without animation
      container.style.transition = 'none';
      container.style.maxHeight = isCollapsed ? '0px' : 'none';
      container.style.opacity = isCollapsed ? '0' : '1';
      container.offsetHeight; // force reflow
      container.style.transition = '';
      return;
    }

    if (isCollapsed) {
      container.style.transition = 'none';
      container.style.maxHeight = `${content.scrollHeight}px`;
      container.offsetHeight; // force reflow
      container.style.transition = '';
      container.style.maxHeight = '0px';
      container.style.opacity = '0';
    } else {
      container.style.transition = 'none';
      container.style.maxHeight = '0px';
      container.offsetHeight; // force reflow
      container.style.transition = '';
      container.style.maxHeight = `${content.scrollHeight}px`;
      container.style.opacity = '1';
      const onEnd = () => {
        container.style.maxHeight = 'none';
      };
      container.addEventListener('transitionend', onEnd, { once: true });
      return () => container.removeEventListener('transitionend', onEnd);
    }
  }, [isCollapsed]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
    >
      <div
        ref={contentRef}
      >
        {children}
      </div>
    </div>
  );
}

function SharedWithMeCard({
  album,
  isSelected,
  onClick,
  onDoubleClick,
}: {
  album: SharedWithMeAlbum;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const coverImage = album.cover_image_url || album.photos?.[0]?.photo_url;
  const photoCount = album.photos?.length || 0;
  const ownerName = album.owner_profile?.nickname || album.owner_profile?.full_name || 'Unknown';

  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`relative overflow-hidden bg-background-light transition-all border block w-full text-left ${
        isSelected
          ? 'border-primary ring-2 ring-primary/50'
          : 'border-border-color hover:ring-2 hover:ring-primary/50'
      }`}
    >
      <div
        className="relative flex aspect-4/3 items-center justify-center overflow-hidden bg-background"
      >
        {coverImage ? (
          <BlurImage
            src={getCroppedThumbnailUrl(coverImage, 250, 188, 85) || coverImage}
            alt={album.title}
            blurhash={album.cover_image_blurhash}
            fill
            sizes="250px"
            quality={85}
            className="object-cover"
            draggable={false}
          />
        ) : (
          <FolderSVG
            className="size-12 text-foreground/20"
          />
        )}

        <CardBadges
          badges={[{
            icon: <UsersMicroSVG
              className="size-4"
            />,
            variant: 'in-album',
            tooltip: `Shared by @${ownerName}`,
          }]}
        />
      </div>

      <div
        className="p-3"
      >
        <h3
          className="text-sm font-semibold line-clamp-1"
        >
          {album.title}
        </h3>
        <div
          className="flex items-center justify-between mt-1.5"
        >
          <div
            className="flex items-center gap-1.5 text-xs text-foreground/70"
          >
            <Avatar
              avatarUrl={album.owner_profile?.avatar_url}
              fullName={album.owner_profile?.full_name}
              size="xxs"
            />
            <span>
              @
              {ownerName}
            </span>
          </div>
          {photoCount > 0 && (
            <div
              className="text-xs text-foreground/50"
            >
              {photoCount}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function SharedWithYouGrid({
  pendingInvites,
  albums,
  selectedPendingInviteId,
  selectedAlbumId,
  onSelectInvite,
  onSelectAlbum,
  onDoubleClickAlbum,
}: {
  pendingInvites: PendingAlbumInvite[];
  albums: SharedWithMeAlbum[];
  selectedPendingInviteId: number | null;
  selectedAlbumId: string | null;
  onSelectInvite: (requestId: number) => void;
  onSelectAlbum: (albumId: string) => void;
  onDoubleClickAlbum: (album: SharedWithMeAlbum) => void;
}) {
  if (pendingInvites.length === 0 && albums.length === 0) {
    return null;
  }

  return (
    <div
      className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] select-none p-3 md:p-6 content-start"
    >
      {pendingInvites.map((invite) => (
        <PendingInviteCard
          key={`invite-${invite.requestId}`}
          invite={invite}
          isSelected={invite.requestId === selectedPendingInviteId}
          onClick={() => onSelectInvite(invite.requestId)}
        />
      ))}
      {albums.map((album) => (
        <SharedWithMeCard
          key={album.id}
          album={album}
          isSelected={album.id === selectedAlbumId}
          onClick={() => onSelectAlbum(album.id)}
          onDoubleClick={() => onDoubleClickAlbum(album)}
        />
      ))}
    </div>
  );
}

function PendingInviteCard({
  invite,
  isSelected,
  onClick,
}: {
  invite: PendingAlbumInvite;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { album } = invite;
  const coverImage = album.cover_image_url || album.photos?.[0]?.photo_url;
  const ownerName = album.owner_profile?.nickname || album.owner_profile?.full_name || 'Unknown';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden bg-background-light transition-all border block w-full text-left ${
        isSelected
          ? 'border-primary ring-2 ring-primary/50'
          : 'border-amber-500/50 ring-1 ring-amber-500/20 hover:ring-2 hover:ring-primary/50'
      }`}
    >
      <div
        className="relative flex aspect-4/3 items-center justify-center overflow-hidden bg-background"
      >
        {coverImage ? (
          <BlurImage
            src={getCroppedThumbnailUrl(coverImage, 250, 188, 85) || coverImage}
            alt={album.title}
            blurhash={album.cover_image_blurhash}
            fill
            sizes="250px"
            quality={85}
            className="object-cover"
            draggable={false}
          />
        ) : (
          <FolderSVG
            className="size-12 text-foreground/20"
          />
        )}
        <CardBadges
          badges={[{
            icon: <ClockMiniSVG
              className="size-4"
            />,
            variant: 'pending',
            tooltip: `Invited by @${ownerName}`,
          }]}
        />
      </div>

      <div
        className="p-3"
      >
        <h3
          className="text-sm font-semibold line-clamp-1"
        >
          {album.title}
        </h3>
        <div
          className="flex items-center gap-1.5 text-xs text-foreground/70 mt-1.5"
        >
          <Avatar
            avatarUrl={album.owner_profile?.avatar_url}
            fullName={album.owner_profile?.full_name}
            size="xxs"
          />
          <span>
            @
            {ownerName}
          </span>
        </div>
      </div>
    </button>
  );
}


function PendingInviteSidebar({
  invite,
  userId,
  onResolved,
}: {
  invite: PendingAlbumInvite;
  userId: string | undefined;
  onResolved: () => void;
}) {
  const queryClient = useQueryClient();
  const { album } = invite;
  const ownerName = album.owner_profile?.nickname || album.owner_profile?.full_name || 'Unknown';

  const resolveMutation = useMutation({
    mutationFn: async (action: 'accept' | 'decline') => {
      const { error } = await supabase.rpc('resolve_album_request', {
        p_request_id: invite.requestId,
        p_action: action,
      });
      if (error) throw new Error(error.message || 'Failed to resolve invite');
      return action;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-album-invites', userId] });
      queryClient.invalidateQueries({ queryKey: ['shared-with-me-albums', userId] });
      onResolved();
    },
  });

  return (
    <SidebarPanel
      title="Album invite"
      footer={
        <div
          className="flex gap-2 w-full"
        >
          <Button
            variant="secondary"
            onClick={() => resolveMutation.mutate('decline')}
            disabled={resolveMutation.isPending}
            fullWidth
          >
            Decline
          </Button>
          <Button
            variant="primary"
            onClick={() => resolveMutation.mutate('accept')}
            disabled={resolveMutation.isPending}
            loading={resolveMutation.isPending}
            fullWidth
          >
            Accept
          </Button>
        </div>
      }
    >
      <div
        className="space-y-4"
      >
        <div>
          <h3
            className="text-lg font-semibold"
          >
            {album.title}
          </h3>
          {album.description && (
            <p
              className="mt-1 text-sm text-foreground/70"
            >
              {album.description}
            </p>
          )}
        </div>
        <div
          className="text-sm text-foreground/60 space-y-2"
        >
          <div
            className="flex items-center gap-1.5"
          >
            <Avatar
              avatarUrl={album.owner_profile?.avatar_url}
              fullName={album.owner_profile?.full_name}
              size="xxs"
            />
            <span
              className="text-foreground/80 font-medium"
            >
              @
              {ownerName}
            </span>
          </div>
          <p>
            {album.photos?.length || 0}
            {' '}
            {(album.photos?.length || 0) === 1 ? 'photo' : 'photos'}
          </p>
        </div>
        <div
          className="pt-2 border-t border-border-color text-sm text-foreground/70"
        >
          You&apos;ve been invited to this shared album. Accept to start adding and viewing photos.
        </div>
      </div>
    </SidebarPanel>
  );
}
