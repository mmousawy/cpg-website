'use client';

import Avatar from '@/components/auth/Avatar';
import { modalPopoverZClassName } from '@/components/layout/mobileChrome';
import MemberHoverCard from '@/components/shared/MemberHoverCard';
import { useMentionSearch } from '@/hooks/useMentionSearch';
import { getOverlayPortalRoot, PORTAL_OVERLAY_ATTR } from '@/lib/focusTrapPortals';
import type { MentionProfile } from '@/lib/mentions/types';
import clsx from 'clsx';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type PhotoMemberTag = {
  id: string;
  profileId: string;
  nickname: string;
  fullName: string | null;
  avatarUrl: string | null;
  x: number;
  y: number;
};

const TAGS_EVENT = 'cpg-photo-member-tags';
const TAG_PICKER_GAP_PX = 10;
const TAG_PICKER_MARGIN_PX = 8;
const TAG_PICKER_DEFAULT_LIST_MAX_PX = 192;

function getTagAnchorClientPoint(
  overlayEl: HTMLElement | null,
  point: { x: number; y: number },
): { x: number; y: number } | null {
  const frame = overlayEl?.parentElement;
  const img = frame?.querySelector('img');
  const rect = img?.getBoundingClientRect() ?? overlayEl?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return null;
  return {
    x: rect.left + point.x * rect.width,
    y: rect.top + point.y * rect.height,
  };
}

function layoutPhotoMemberTagPicker(
  anchorX: number,
  anchorY: number,
  pickerEl: HTMLElement,
): { top: number; left: number; maxListHeight: number } {
  const margin = TAG_PICKER_MARGIN_PX;
  const gap = TAG_PICKER_GAP_PX;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = pickerEl.offsetWidth;
  const h = pickerEl.offsetHeight;

  let left = anchorX - w / 2;
  left = Math.min(Math.max(margin, left), vw - w - margin);

  let top = anchorY + gap;
  if (top + h > vh - margin) {
    top = anchorY - h - gap;
  }
  top = Math.min(Math.max(margin, top), Math.max(margin, vh - h - margin));

  const resultsEl = pickerEl.querySelector('[data-tag-picker-results]');
  const listTop = resultsEl?.getBoundingClientRect().top
    ?? pickerEl.querySelector('[data-tag-picker-input]')?.getBoundingClientRect().bottom
    ?? top + 72;
  const maxListHeight = Math.max(
    64,
    Math.min(TAG_PICKER_DEFAULT_LIST_MAX_PX, vh - margin - listTop),
  );

  return { top, left, maxListHeight };
}

export function notifyPhotoMemberTags(photoId: string) {
  window.dispatchEvent(new CustomEvent(TAGS_EVENT, { detail: photoId }));
}

function usePhotoMemberTags(photoId: string | undefined) {
  const [tags, setTags] = useState<PhotoMemberTag[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!photoId) return;
    const response = await fetch(`/api/photos/${photoId}/member-tags`);
    if (!response.ok) return;
    const data = await response.json();
    setTags(data.tags ?? []);
    setCanEdit(Boolean(data.canEdit));
    setViewerId(data.viewerId ?? null);
  }, [photoId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === photoId) void load();
    };
    window.addEventListener(TAGS_EVENT, onChange);
    return () => window.removeEventListener(TAGS_EVENT, onChange);
  }, [load, photoId]);

  return { tags, canEdit, viewerId, reload: load };
}

function TagDot({ tag }: { tag: PhotoMemberTag }) {
  return (
    <span
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${tag.x * 100}%`, top: `${tag.y * 100}%`, pointerEvents: 'auto' }}
    >
      <MemberHoverCard
        nickname={tag.nickname}
        fullName={tag.fullName}
        avatarUrl={tag.avatarUrl}
      >
        <button
          type="button"
          aria-label={`Tagged ${tag.nickname}`}
          className="size-4 rounded-full border-2 border-white bg-primary shadow"
          onClick={(event) => event.stopPropagation()}
        />
      </MemberHoverCard>
    </span>
  );
}

type PhotoMemberTagLayerProps = {
  photoId: string;
  /** When false, dots are shown but placement controls are hidden (public photo page). */
  allowPlacement?: boolean;
  /** Overlay "Tag people" toggle on the image (off in the manage modal). */
  showPlacementControl?: boolean;
  /** Start in placement mode and keep it on (manage modal). */
  autoTagMode?: boolean;
  /** Hide on-image hint chips; parent can show instructions instead. */
  hideInlineHints?: boolean;
  onTagModeChange?: (active: boolean) => void;
};

export function PhotoMemberTagLayer({
  photoId,
  allowPlacement = false,
  showPlacementControl = true,
  autoTagMode = false,
  hideInlineHints = false,
  onTagModeChange,
}: PhotoMemberTagLayerProps) {
  const { tags, canEdit } = usePhotoMemberTags(photoId);
  const [tagMode, setTagMode] = useState(autoTagMode);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pickerLayout, setPickerLayout] = useState<{
    top: number;
    left: number;
    maxListHeight: number;
  } | null>(null);
  const tagOverlayRef = useRef<HTMLDivElement>(null);
  const tagPickerRef = useRef<HTMLDivElement>(null);
  const tagSearchInputRef = useRef<HTMLInputElement>(null);
  const mentionQuery = point && query.trim().length > 0 ? query : null;
  const { results, loading } = useMentionSearch(mentionQuery);

  const updatePickerLayout = useCallback(() => {
    if (!point || !tagPickerRef.current || !tagOverlayRef.current) {
      setPickerLayout(null);
      return;
    }
    const anchor = getTagAnchorClientPoint(tagOverlayRef.current, point);
    if (!anchor) {
      setPickerLayout(null);
      return;
    }
    setPickerLayout(layoutPhotoMemberTagPicker(anchor.x, anchor.y, tagPickerRef.current));
  }, [point]);

  useLayoutEffect(() => {
    if (!point) {
      setPickerLayout(null);
      return;
    }
    updatePickerLayout();
    const onViewportChange = () => {
      requestAnimationFrame(() => updatePickerLayout());
    };
    window.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('scroll', onViewportChange);
    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('scroll', onViewportChange);
    };
  }, [point, updatePickerLayout]);

  useLayoutEffect(() => {
    if (!point) return;
    requestAnimationFrame(() => updatePickerLayout());
  }, [point, results.length, loading, error, updatePickerLayout]);

  useEffect(() => {
    onTagModeChange?.(tagMode);
  }, [tagMode, onTagModeChange]);

  useEffect(() => {
    if (!point) return;
    const frame = requestAnimationFrame(() => {
      tagSearchInputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [point]);

  useEffect(() => {
    if (!tagMode) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (point) {
          setPoint(null);
          setQuery('');
          return;
        }
        if (!autoTagMode) {
          setTagMode(false);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tagMode, autoTagMode, point]);

  const placeTag = async (profile: MentionProfile) => {
    if (!point) return;
    setError(null);
    const response = await fetch(`/api/photos/${photoId}/member-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: profile.id, x: point.x, y: point.y }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setPoint(null);
      setQuery('');
      setError(data.message || 'Could not tag that member');
      return;
    }
    setPoint(null);
    setQuery('');
    if (!autoTagMode) {
      setTagMode(false);
    }
    notifyPhotoMemberTags(photoId);
  };

  return (
    <>
      <div
        ref={tagOverlayRef}
        className={clsx(
          'absolute inset-0',
          tagMode && 'z-10 cursor-crosshair',
        )}
        style={{ pointerEvents: tagMode ? 'auto' : 'none' }}
        onClick={(event) => {
          if (!tagMode) return;
          event.preventDefault();
          event.stopPropagation();
          const host = event.currentTarget.parentElement;
          const img = host?.querySelector('img');
          const rect = img?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
          const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
          setPoint({ x, y });
          setQuery('');
          setHighlightedIndex(0);
        }}
      >
        {tags.map((tag) => <TagDot
          key={tag.id}
          tag={tag}
        />)}
        {point ? (
          <span
            className="absolute z-20 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary/70"
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%`, pointerEvents: 'none' }}
          />
        ) : null}
      </div>
      {allowPlacement && canEdit && showPlacementControl ? (
        <button
          type="button"
          className="absolute right-2 top-2 z-20 rounded bg-black/60 px-2 py-1 text-xs text-white"
          style={{ pointerEvents: 'auto' }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setTagMode((current) => !current);
            setPoint(null);
            setError(null);
          }}
        >
          {tagMode ? 'Done tagging' : 'Tag people'}
        </button>
      ) : null}
      {error && !point ? (
        <p
          className={clsx(
            hideInlineHints
              ? 'relative z-20 mt-2 text-sm text-red-500'
              : 'absolute left-2 top-2 z-20 max-w-xs rounded bg-black/70 px-2 py-1 text-xs text-white',
          )}
          style={{ pointerEvents: 'none' }}
        >
          {error}
        </p>
      ) : null}
      {tagMode && !point && !hideInlineHints ? (
        <p
          className="absolute bottom-2 left-2 z-20 rounded bg-black/60 px-2 py-1 text-xs text-white"
          style={{ pointerEvents: 'none' }}
        >
          Click the photo to place a tag. Escape cancels.
        </p>
      ) : null}
      {point && typeof document !== 'undefined' ? createPortal(
        <div
          ref={tagPickerRef}
          {...{ [PORTAL_OVERLAY_ATTR]: '' }}
          className={clsx(
            'fixed w-56 rounded-md border border-border-color bg-background p-2 shadow-lg',
            modalPopoverZClassName,
            !pickerLayout && 'invisible',
          )}
          style={{
            top: pickerLayout?.top ?? 0,
            left: pickerLayout?.left ?? 0,
          }}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
        >
          <input
            ref={tagSearchInputRef}
            data-tag-picker-input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value.replace(/^@/, ''));
              setHighlightedIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && results.length > 0) {
                event.preventDefault();
                setHighlightedIndex((index) => (index + 1) % results.length);
              } else if (event.key === 'ArrowUp' && results.length > 0) {
                event.preventDefault();
                setHighlightedIndex((index) => (index - 1 + results.length) % results.length);
              } else if (event.key === 'Enter' && results[highlightedIndex]) {
                event.preventDefault();
                void placeTag(results[highlightedIndex]);
              } else if (event.key === 'Escape') {
                setPoint(null);
              }
            }}
            placeholder="Search by nickname"
            className="w-full rounded border border-border-color bg-background-medium px-2 py-1 text-sm"
          />
          {error ? <p
            className="mt-1 text-xs text-red-500"
          >{error}</p> : null}
          {loading || results.length > 0 ? (
            <div
              data-tag-picker-results
              className="mt-1 overflow-y-auto overscroll-contain"
              style={{ maxHeight: pickerLayout?.maxListHeight ?? TAG_PICKER_DEFAULT_LIST_MAX_PX }}
            >
              {loading ? <p
                className="px-1 py-1 text-xs text-foreground/60"
              >Searching…</p> : null}
              {results.map((profile, index) => (
                <button
                  key={profile.id}
                  type="button"
                  className={clsx(
                    'flex w-full items-center gap-2 rounded px-1 py-1.5 text-left text-sm',
                    index === highlightedIndex ? 'bg-background-medium' : 'hover:bg-background-medium',
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    void placeTag(profile);
                  }}
                >
                  <Avatar
                    avatarUrl={profile.avatar_url}
                    fullName={profile.full_name}
                    nickname={profile.nickname}
                    size="xs"
                  />
                  <span
                    className="min-w-0"
                  >
                    <span
                      className="block truncate font-medium"
                    >
                      {profile.full_name || profile.nickname}
                    </span>
                    <span
                      className="block truncate text-xs text-foreground/70"
                    >
                      @{profile.nickname}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>,
        getOverlayPortalRoot(tagOverlayRef.current) ?? document.body,
      ) : null}
    </>
  );
}

export function PhotoMemberTagList({
  photoId,
  className,
}: {
  photoId: string;
  className?: string;
}) {
  const { tags, canEdit, viewerId } = usePhotoMemberTags(photoId);
  if (tags.length === 0) return null;

  const removeTag = async (profileId: string) => {
    const response = await fetch(`/api/photos/${photoId}/member-tags?profileId=${profileId}`, {
      method: 'DELETE',
    });
    if (response.ok) notifyPhotoMemberTags(photoId);
  };

  return (
    <div
      className={clsx('mb-4', className)}
    >
      <p
        className="mb-1.5 text-xs font-medium text-foreground/80"
      >People</p>
      <ul
        className="space-y-1"
      >
        {tags.map((tag) => {
          const canRemove = canEdit || tag.profileId === viewerId;
          return (
            <li
              key={tag.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <MemberHoverCard
                nickname={tag.nickname}
                fullName={tag.fullName}
                avatarUrl={tag.avatarUrl}
              >
                <Link
                  href={`/@${tag.nickname}`}
                  className="hover:text-primary"
                >
                  @{tag.nickname}
                </Link>
              </MemberHoverCard>
              {canRemove ? (
                <button
                  type="button"
                  className="text-xs text-foreground/60 hover:text-foreground"
                  onClick={() => { void removeTag(tag.profileId); }}
                >
                  Remove
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
