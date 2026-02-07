'use client';

import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useContext, useState } from 'react';

import { getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ModalContext } from '@/app/providers/ModalProvider';
import ResolveReportModal from '@/components/admin/ResolveReportModal';
import Avatar from '@/components/auth/Avatar';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import GridCheckbox from '@/components/shared/GridCheckbox';
import StickyActionBar from '@/components/shared/StickyActionBar';
import {
  useBulkResolveReports,
  useReportCounts,
  useReportsForReview,
  useResolveReport,
} from '@/hooks/useReports';
import type { ReportForReview, ReportStatus } from '@/types/reports';
import { supabase } from '@/utils/supabase/client';

import CancelSVG from 'public/icons/cancel.svg';
import CheckSVG from 'public/icons/check.svg';
import ContentSVG from 'public/icons/content.svg';
import LinkSVG from 'public/icons/link.svg';

type TabStatus = ReportStatus;

// Component to fetch and display profile link for profile reports
function ProfileReportLink({ profileId }: { profileId: string }) {
  const { data: profile } = useQuery({
    queryKey: ['profile', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, avatar_url, full_name')
        .eq('id', profileId)
        .single();
      if (error || !data) return null;
      return data;
    },
  });

  if (!profile?.nickname) {
    return (
      <span
        className="text-sm text-foreground/60"
      >
        Loading...
      </span>
    );
  }

  return (
    <Link
      href={`/@${profile.nickname}`}
      className="text-sm font-medium hover:text-primary flex items-center gap-1"
    >
      View profile
      <LinkSVG
        className="size-3"
      />
    </Link>
  );
}

// Component to fetch and display photo preview with link
function PhotoReportPreview({ photoId }: { photoId: string }) {
  const { data: photoData } = useQuery({
    queryKey: ['photo-report', photoId],
    queryFn: async () => {
      const { data: photo, error: photoError } = await supabase
        .from('photos')
        .select('id, title, url, short_id, user_id, blurhash')
        .eq('id', photoId)
        .is('deleted_at', null)
        .single();

      if (photoError || !photo || !photo.user_id) return null;

      // Fetch owner profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, avatar_url, full_name')
        .eq('id', photo.user_id)
        .single();

      return {
        photo,
        owner: profile ? {
          nickname: profile.nickname,
          avatar_url: profile.avatar_url,
          full_name: profile.full_name,
        } : null,
      };
    },
  });

  if (!photoData) {
    return (
      <span
        className="text-sm text-foreground/60"
      >
        Loading...
      </span>
    );
  }

  const { photo, owner } = photoData;
  const link = owner?.nickname && photo.short_id
    ? `/@${owner.nickname}/photo/${photo.short_id}`
    : null;

  return (
    <div
      className="space-y-2"
    >
      <div
        className="flex items-center gap-2"
      >
        {photo.url && link ? (
          <Link
            href={link}
            className="relative w-12 h-12 rounded overflow-hidden bg-border-color shrink-0 hover:opacity-80 transition-opacity"
          >
            <Image
              src={getSquareThumbnailUrl(photo.url, 48, 85) || photo.url}
              alt={photo.title || 'Photo'}
              fill
              className="object-cover"
              sizes="48px"
            />
          </Link>
        ) : photo.url ? (
          <div
            className="relative w-12 h-12 rounded overflow-hidden bg-border-color shrink-0"
          >
            <Image
              src={getSquareThumbnailUrl(photo.url, 48, 85) || photo.url}
              alt={photo.title || 'Photo'}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        ) : null}
        <div
          className="flex-1 min-w-0"
        >
          <p
            className="text-xs text-foreground/60 mb-1"
          >
            {photo.title || 'Untitled Photo'}
            {photo.short_id && ` (${photo.short_id})`}
          </p>
          {link && (
            <Link
              href={link}
              className="text-sm font-medium hover:text-primary flex items-center gap-1"
            >
              View photo
              <LinkSVG
                className="size-3"
              />
            </Link>
          )}
        </div>
      </div>
      {owner && (
        <div
          className="flex items-center gap-2 text-xs"
        >
          <span
            className="text-foreground/50"
          >
            By:
          </span>
          <Link
            href={`/@${owner.nickname}`}
            className="hover:opacity-80 transition-opacity"
          >
            <Avatar
              avatarUrl={owner.avatar_url}
              fullName={owner.full_name}
              size="xxs"
            />
          </Link>
          <Link
            href={`/@${owner.nickname}`}
            className="text-foreground/70 hover:text-primary font-medium"
          >
            @
            {owner.nickname}
          </Link>
        </div>
      )}
    </div>
  );
}

// Component to fetch and display album preview with link
function AlbumReportPreview({ albumId }: { albumId: string }) {
  const { data: albumData } = useQuery({
    queryKey: ['album-report', albumId],
    queryFn: async () => {
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .select('id, title, cover_image_url, slug, user_id')
        .eq('id', albumId)
        .is('deleted_at', null)
        .single();

      if (albumError || !album || !album.user_id) return null;

      // Fetch owner profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, avatar_url, full_name')
        .eq('id', album.user_id)
        .single();

      return {
        album,
        owner: profile ? {
          nickname: profile.nickname,
          avatar_url: profile.avatar_url,
          full_name: profile.full_name,
        } : null,
      };
    },
  });

  if (!albumData) {
    return (
      <span
        className="text-sm text-foreground/60"
      >
        Loading...
      </span>
    );
  }

  const { album, owner } = albumData;
  const link = owner?.nickname && album.slug
    ? `/@${owner.nickname}/album/${album.slug}`
    : null;

  return (
    <div
      className="space-y-2"
    >
      <div
        className="flex items-center gap-2"
      >
        {album.cover_image_url && link ? (
          <Link
            href={link}
            className="relative w-12 h-12 rounded overflow-hidden bg-border-color shrink-0 hover:opacity-80 transition-opacity"
          >
            <Image
              src={getSquareThumbnailUrl(album.cover_image_url, 48, 85) || album.cover_image_url}
              alt={album.title || 'Album'}
              fill
              className="object-cover"
              sizes="48px"
            />
          </Link>
        ) : album.cover_image_url ? (
          <div
            className="relative w-12 h-12 rounded overflow-hidden bg-border-color shrink-0"
          >
            <Image
              src={getSquareThumbnailUrl(album.cover_image_url, 48, 85) || album.cover_image_url}
              alt={album.title || 'Album'}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        ) : null}
        <div
          className="flex-1 min-w-0"
        >
          <p
            className="text-xs text-foreground/60 mb-1"
          >
            {album.title || 'Untitled Album'}
            {album.slug && ` (${album.slug})`}
          </p>
          {link && (
            <Link
              href={link}
              className="text-sm font-medium hover:text-primary flex items-center gap-1"
            >
              View album
              <LinkSVG
                className="size-3"
              />
            </Link>
          )}
        </div>
      </div>
      {owner && (
        <div
          className="flex items-center gap-2 text-xs"
        >
          <span
            className="text-foreground/50"
          >
            By:
          </span>
          <Link
            href={`/@${owner.nickname}`}
            className="hover:opacity-80 transition-opacity"
          >
            <Avatar
              avatarUrl={owner.avatar_url}
              fullName={owner.full_name}
              size="xxs"
            />
          </Link>
          <Link
            href={`/@${owner.nickname}`}
            className="text-foreground/70 hover:text-primary font-medium"
          >
            @
            {owner.nickname}
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const confirm = useConfirm();
  const modalContext = useContext(ModalContext);

  const [activeTab, setActiveTab] = useState<TabStatus>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);

  const { data: reports, isLoading } = useReportsForReview(activeTab);
  const { data: counts } = useReportCounts();
  const resolveMutation = useResolveReport();
  const bulkResolveMutation = useBulkResolveReports();

  const isResolving = resolveMutation.isPending || bulkResolveMutation.isPending;

  const handleTabChange = (tab: TabStatus) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === (reports || []).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set((reports || []).map((r) => r.id)));
    }
  };

  const handleResolve = async (reportId: string) => {
    setResolvingReportId(reportId);
    modalContext.setSize('default');
    modalContext.setTitle('Resolve report');
    modalContext.setContent(
      <ResolveReportModal
        reportId={reportId}
        onResolve={async (resolutionType, message) => {
          await resolveMutation.mutateAsync({
            reportId,
            status: 'resolved',
            resolutionType,
            adminNotes: message || resolutionType,
          });
          modalContext.setIsOpen(false);
          setResolvingReportId(null);
        }}
        onCancel={() => {
          modalContext.setIsOpen(false);
          setResolvingReportId(null);
        }}
        isSubmitting={isResolving}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const handleDismiss = async (reportId: string) => {
    setResolvingReportId(reportId);
    modalContext.setSize('default');
    modalContext.setTitle('Dismiss report');
    modalContext.setContent(
      <ResolveReportModal
        reportId={reportId}
        actionType="dismiss"
        onResolve={async (resolutionType, message) => {
          await resolveMutation.mutateAsync({
            reportId,
            status: 'dismissed',
            resolutionType,
            adminNotes: message || resolutionType,
          });
          modalContext.setIsOpen(false);
          setResolvingReportId(null);
        }}
        onCancel={() => {
          modalContext.setIsOpen(false);
          setResolvingReportId(null);
        }}
        isSubmitting={isResolving}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const handleBulkResolve = async () => {
    if (selectedIds.size === 0) return;

    setResolvingReportId('bulk');
    modalContext.setSize('default');
    modalContext.setTitle('Resolve selected reports');
    modalContext.setContent(
      <ResolveReportModal
        reportCount={selectedIds.size}
        actionType="resolve"
        onResolve={async (resolutionType, message) => {
          await bulkResolveMutation.mutateAsync({
            reportIds: Array.from(selectedIds),
            status: 'resolved',
            resolutionType,
            adminNotes: message || resolutionType,
          });
          modalContext.setIsOpen(false);
          setResolvingReportId(null);
          setSelectedIds(new Set());
        }}
        onCancel={() => {
          modalContext.setIsOpen(false);
          setResolvingReportId(null);
        }}
        isSubmitting={isResolving}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const handleBulkDismiss = async () => {
    if (selectedIds.size === 0) return;

    setResolvingReportId('bulk');
    modalContext.setSize('default');
    modalContext.setTitle('Dismiss selected reports');
    modalContext.setContent(
      <ResolveReportModal
        reportCount={selectedIds.size}
        actionType="dismiss"
        onResolve={async (resolutionType, message) => {
          await bulkResolveMutation.mutateAsync({
            reportIds: Array.from(selectedIds),
            status: 'dismissed',
            resolutionType,
            adminNotes: message || resolutionType,
          });
          modalContext.setIsOpen(false);
          setResolvingReportId(null);
          setSelectedIds(new Set());
        }}
        onCancel={() => {
          modalContext.setIsOpen(false);
          setResolvingReportId(null);
        }}
        isSubmitting={isResolving}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const tabs: { key: TabStatus; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: counts?.pending || 0 },
    { key: 'resolved', label: 'Resolved', count: counts?.resolved || 0 },
    { key: 'dismissed', label: 'Dismissed', count: counts?.dismissed || 0 },
  ];

  const getEntityLink = (report: ReportForReview): string | null => {
    if (report.entity_type === 'photo') {
      // Would need to fetch photo to get short_id and owner nickname
      return null;
    } else if (report.entity_type === 'album') {
      // Would need to fetch album to get slug and owner nickname
      return null;
    } else if (report.entity_type === 'profile') {
      // For profile reports, entity_id is the profile ID
      // We'll fetch it separately - return a placeholder that will be replaced
      return `/profile/${report.entity_id}`;
    }
    return null;
  };

  const getEntityPreview = (report: ReportForReview) => {
    if (report.entity_type === 'photo') {
      return { type: 'Photo', thumbnail: null };
    } else if (report.entity_type === 'album') {
      return { type: 'Album', thumbnail: null };
    } else if (report.entity_type === 'profile') {
      return { type: 'Profile', thumbnail: null };
    } else if (report.entity_type === 'comment') {
      return { type: 'Comment', thumbnail: null };
    }
    return { type: 'Unknown', thumbnail: null };
  };

  return (
    <>
      <PageContainer
        className="flex-1"
      >
        {/* Header */}
        <div
          className="mb-8"
        >
          <h1
            className="text-2xl sm:text-3xl font-bold"
          >
            Content reports
          </h1>
          <p
            className="text-base sm:text-lg mt-2 text-foreground/70"
          >
            Review and manage user-submitted content reports
          </p>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-2 mt-6 flex-wrap"
        >
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              variant={activeTab === tab.key ? 'primary' : 'secondary'}
              size="sm"
              className="pr-2.5"
            >
              {tab.label}
              {' '}
              <span
                className={clsx(
                  'text-xs px-2 py-0.5 rounded-full',
                  activeTab === tab.key
                    ? 'bg-white/20'
                    : 'bg-foreground/10',
                )}
              >
                {tab.count}
              </span>
            </Button>
          ))}
        </div>

        {/* Bulk actions for pending tab */}
        {activeTab === 'pending' && (reports || []).length > 0 && (
          <div
            className="flex items-center gap-3 mt-4"
          >
            <Button
              onClick={handleSelectAll}
              variant="secondary"
              size="sm"
              className="text-foreground/70"
            >
              {selectedIds.size === (reports || []).length
                ? 'Deselect all'
                : 'Select all'}
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div
            className="text-center py-12"
          >
            <p
              className="text-foreground/50 animate-pulse"
            >
              Loading reports...
            </p>
          </div>
        ) : (reports || []).length === 0 ? (
          <div
            className="text-center py-12"
          >
            <ContentSVG
              className="mb-4 inline-block h-12 w-12 fill-foreground/50"
            />
            <p
              className="mb-4 text-foreground/80"
            >
              {activeTab === 'pending'
                ? 'No pending reports'
                : activeTab === 'resolved'
                  ? 'No resolved reports'
                  : 'No dismissed reports'}
            </p>
          </div>
        ) : (
          <>
            {/* Reports grid */}
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4"
            >
              {(reports || []).map((report) => {
                const entityPreview = getEntityPreview(report);
                const entityLink = getEntityLink(report);
                const isSelected = selectedIds.has(report.id);
                const isAnonymous = !report.reporter_id;

                return (
                  <div
                    key={report.id}
                    className={clsx(
                      'relative rounded-lg border border-border-color bg-background-light p-4',
                      isSelected && 'ring-2 ring-primary',
                    )}
                  >
                    {/* Selection checkbox */}
                    {activeTab === 'pending' && (
                      <div
                        className="absolute right-4 top-0 z-10"
                      >
                        <GridCheckbox
                          isSelected={isSelected}
                          onClick={() => handleSelect(report.id)}
                          alwaysVisible
                          className="relative left-0 top-0"
                        />
                      </div>
                    )}

                    {/* Two-column layout */}
                    <div>
                      {/* Date row */}
                      <div
                        className="grid grid-cols-[70px_1fr] gap-4 items-baseline"
                      >
                        <div
                          className="text-xs text-foreground/60 font-medium whitespace-nowrap"
                        >
                          Date
                        </div>
                        <p
                          className="text-xs text-foreground/50"
                        >
                          {new Date(report.created_at).toLocaleString()}
                        </p>
                      </div>

                      <hr
                        className="border-border-color mt-3 mb-3"
                      />

                      {/* Reporter row */}
                      <div
                        className="grid grid-cols-[70px_1fr] gap-4 items-start"
                      >
                        <div
                          className="text-xs text-foreground/60 font-medium whitespace-nowrap pt-0.5"
                        >
                          Reporter
                        </div>
                        <div
                          className="flex items-center gap-3"
                        >
                          {isAnonymous ? (
                            <>
                              <div
                                className="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0"
                              >
                                <span
                                  className="text-primary font-semibold"
                                >
                                  {report.reporter_name?.charAt(0).toUpperCase() || 'A'}
                                </span>
                              </div>
                              <div
                                className="flex-1 min-w-0"
                              >
                                <p
                                  className="text-sm font-medium truncate"
                                >
                                  {report.reporter_name || 'Anonymous'}
                                </p>
                                <p
                                  className="text-xs text-foreground/60 truncate"
                                >
                                  {report.reporter_email}
                                </p>
                                <span
                                  className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600"
                                >
                                  Anonymous
                                </span>
                              </div>
                            </>
                          ) : report.reporter ? (
                            <>
                              <Link
                                href={`/@${report.reporter.nickname}`}
                                className="hover:opacity-80 transition-opacity"
                              >
                                <Avatar
                                  avatarUrl={report.reporter.avatar_url}
                                  fullName={report.reporter.full_name}
                                  size="sm"
                                />
                              </Link>
                              <div
                                className="flex-1 min-w-0"
                              >
                                <Link
                                  href={`/@${report.reporter.nickname}`}
                                  className="text-sm font-medium hover:text-primary truncate block"
                                >
                                  {report.reporter.full_name || report.reporter.nickname}
                                </Link>
                                <p
                                  className="text-xs text-foreground/60 truncate"
                                >
                                  @
                                  {report.reporter.nickname}
                                </p>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <hr
                        className="border-border-color mt-3 mb-3"
                      />

                      {/* Reported row */}
                      <div
                        className="grid grid-cols-[70px_1fr] gap-4 items-start"
                      >
                        <div
                          className="text-xs text-foreground/60 font-medium whitespace-nowrap pt-0.5"
                        >
                          Reported
                        </div>
                        <div>
                          {report.entity_type === 'photo' ? (
                            <PhotoReportPreview
                              photoId={report.entity_id}
                            />
                          ) : report.entity_type === 'album' ? (
                            <AlbumReportPreview
                              albumId={report.entity_id}
                            />
                          ) : report.entity_type === 'profile' ? (
                            <ProfileReportLink
                              profileId={report.entity_id}
                            />
                          ) : report.entity_type === 'comment' ? (
                            <div
                              className="text-sm text-foreground/60"
                            >
                              Comment ID:
                              {' '}
                              {report.entity_id.slice(0, 8)}
                              ...
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <hr
                        className="border-border-color mt-3 mb-3"
                      />

                      {/* Reason row */}
                      <div
                        className="grid grid-cols-[70px_1fr] gap-4 items-baseline"
                      >
                        <div
                          className="text-xs text-foreground/60 font-medium whitespace-nowrap"
                        >
                          Reason
                        </div>
                        <p
                          className="text-sm text-foreground/80"
                        >
                          {report.reason}
                        </p>
                      </div>

                      {/* Details row */}
                      {report.details && (
                        <>
                          <hr
                            className="border-border-color mt-3 mb-3"
                          />
                          <div
                            className="grid grid-cols-[70px_1fr] gap-4 items-baseline"
                          >
                            <div
                              className="text-xs text-foreground/60 font-medium whitespace-nowrap"
                            >
                              Details
                            </div>
                            <p
                              className="text-sm text-foreground/80"
                            >
                              {report.details}
                            </p>
                          </div>
                        </>
                      )}

                      {/* Resolved at row - only for resolved/dismissed */}
                      {(activeTab === 'resolved' || activeTab === 'dismissed') && report.reviewed_at && (
                        <>
                          <hr
                            className="border-border-color mt-3 mb-3"
                          />
                          <div
                            className="grid grid-cols-[70px_1fr] gap-4 items-baseline"
                          >
                            <div
                              className="text-xs text-foreground/60 font-medium whitespace-nowrap"
                            >
                              {activeTab === 'resolved' ? 'Resolved at' : 'Dismissed at'}
                            </div>
                            <p
                              className="text-xs text-foreground/50"
                            >
                              {new Date(report.reviewed_at).toLocaleString()}
                            </p>
                          </div>
                        </>
                      )}

                      {/* Resolved by row - only for resolved/dismissed */}
                      {(activeTab === 'resolved' || activeTab === 'dismissed') && report.reviewer && (
                        <>
                          <hr
                            className="border-border-color mt-3 mb-3"
                          />
                          <div
                            className="grid grid-cols-[70px_1fr] gap-4 items-start"
                          >
                            <div
                              className="text-xs text-foreground/60 font-medium whitespace-nowrap pt-0.5"
                            >
                              {activeTab === 'resolved' ? 'Resolved by' : 'Dismissed by'}
                            </div>
                            <div
                              className="flex items-center gap-3"
                            >
                              <Link
                                href={`/@${report.reviewer.nickname}`}
                                className="hover:opacity-80 transition-opacity"
                              >
                                <Avatar
                                  size="sm"
                                  avatarUrl={report.reviewer.avatar_url}
                                  fullName={report.reviewer.full_name}
                                />
                              </Link>
                              <div
                                className="flex-1 min-w-0"
                              >
                                <Link
                                  href={`/@${report.reviewer.nickname}`}
                                  className="text-sm font-medium hover:text-primary truncate block"
                                >
                                  {report.reviewer.full_name || report.reviewer.nickname}
                                </Link>
                                {report.reviewer.nickname && (
                                  <p
                                    className="text-xs text-foreground/60 truncate"
                                  >
                                    {'@'}
                                    {report.reviewer.nickname}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Actions row */}
                      {activeTab === 'pending' && (
                        <>
                          <hr
                            className="border-border-color mt-3 mb-3"
                          />
                          <div
                            className="grid grid-cols-[70px_1fr] gap-4 items-center"
                          >
                            <div
                              className="text-xs text-foreground/60 font-medium whitespace-nowrap"
                            >
                              Actions
                            </div>
                            <div
                              className="flex gap-2"
                            >
                              <Button
                                onClick={() => handleResolve(report.id)}
                                disabled={isResolving}
                                size="sm"
                                className="flex-1"
                              >
                                <CheckSVG
                                  className="size-4 fill-current"
                                />
                                Resolve
                              </Button>
                              <Button
                                onClick={() => handleDismiss(report.id)}
                                disabled={isResolving}
                                variant="danger"
                                size="sm"
                                className="flex-1"
                              >
                                <CancelSVG
                                  className="size-4 fill-current"
                                />
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </PageContainer>
      {/* Sticky action bar for bulk actions */}
      {activeTab === 'pending' && selectedIds.size > 0 && (
        <StickyActionBar>
          <div
            className="flex items-center gap-3 max-w-screen-md w-full mx-auto"
          >
            <span
              className="text-sm flex-1 text-foreground/70"
            >
              {selectedIds.size}
              {' '}
              selected
            </span>
            <Button
              onClick={handleBulkResolve}
              disabled={isResolving}
              size="sm"
            >
              <CheckSVG
                className="size-4 fill-current"
              />
              Resolve all
            </Button>
            <Button
              onClick={handleBulkDismiss}
              disabled={isResolving}
              variant="danger"
              size="sm"
            >
              <CancelSVG
                className="size-4 fill-current"
              />
              Dismiss all
            </Button>
          </div>
        </StickyActionBar>
      )}
    </>
  );
}
