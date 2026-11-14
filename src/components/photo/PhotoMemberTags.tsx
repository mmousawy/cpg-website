'use client';

import Avatar from '@/components/auth/Avatar';
import { modalPopoverZClassName } from '@/components/layout/mobileChrome';
import MemberHoverCard from '@/components/shared/MemberHoverCard';
import { useMentionSearch } from '@/hooks/useMentionSearch';
import {
  getOverlayPortalRoot,
  layoutViewportAnchoredOverlay,
  PORTAL_OVERLAY_ATTR,
  shouldShowPortalOverlay,
} from '@/lib/focusTrapPortals';
import type { MentionProfile } from '@/lib/mentions/types';
import { DetailSidebarSectionHeading } from '@/components/shared/DetailSidebar';
import { tooltipSurfaceClassName } from '@/components/shared/Tooltip';
import { usePhotoTagIdleReveal } from '@/context/PhotoStageIdleRevealContext';
import { useOpenPhotoMemberTagsModal } from '@/hooks/useOpenPhotoMemberTagsModal';
import type { PhotoMemberTag } from '@/lib/data/photoMemberTags';
import {
  getPhotoMemberTagsClientState,
  subscribePhotoMemberTags,
  updatePhotoMemberTagsClientState,
} from '@/lib/photoMemberTags/clientStore';
import type { PhotoWithAlbums } from '@/types/photos';
import clsx from 'clsx';
import Link from 'next/link';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';

import CloseSVG from 'public/icons/close.svg';

export type { PhotoMemberTag };

const TAGS_EVENT = 'cpg-photo-member-tags';
const TAG_PICKER_GAP_PX = 10;
const TAG_PICKER_MARGIN_PX = 8;
const TAG_PICKER_DEFAULT_LIST_MAX_PX = 192;
const TAG_DRAG_THRESHOLD_PX = 4;

function isDraftPhotoMemberTagId(id: string) {
  return id.startsWith('draft-');
}

function createDraftPhotoMemberTag(
  profile: MentionProfile,
  x: number,
  y: number,
): PhotoMemberTag {
  return {
    id: `draft-${crypto.randomUUID()}`,
    profileId: profile.id,
    nickname: profile.nickname,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    x,
    y,
  };
}

function photoMemberTagsSnapshotEqual(a: PhotoMemberTag[], b: PhotoMemberTag[]): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((tag) => [tag.id, tag]));
  return a.every((tag) => {
    const other = byId.get(tag.id);
    return other
      && other.profileId === tag.profileId
      && other.x === tag.x
      && other.y === tag.y;
  });
}

async function persistPhotoMemberTags(
  photoId: string,
  baseline: PhotoMemberTag[],
  draft: PhotoMemberTag[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  for (const tag of baseline) {
    const stillTagged = draft.some((item) => item.profileId === tag.profileId);
    const sameId = draft.find((item) => item.id === tag.id);
    const profileChanged = sameId && sameId.profileId !== tag.profileId;
    if (!stillTagged || profileChanged) {
      const response = await fetch(
        `/api/photos/${photoId}/member-tags?profileId=${tag.profileId}`,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return { ok: false, message: data.message || 'Could not remove a tag' };
      }
    }
  }

  for (const tag of draft) {
    const base = baseline.find((item) => item.id === tag.id && !isDraftPhotoMemberTagId(item.id));
    const isNew = isDraftPhotoMemberTagId(tag.id) || !base;
    const moved = base && (base.x !== tag.x || base.y !== tag.y);
    const profileChanged = base && base.profileId !== tag.profileId;
    if (!isNew && !moved && !profileChanged) continue;

    const response = await fetch(`/api/photos/${photoId}/member-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: tag.profileId, x: tag.x, y: tag.y }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { ok: false, message: data.message || 'Could not save a tag' };
    }
  }

  notifyPhotoMemberTags(photoId);
  return { ok: true };
}

function getRenderedImageContentRect(img: HTMLImageElement): DOMRect {
  const rect = img.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return rect;

  const objectFit = typeof window !== 'undefined' ? getComputedStyle(img).objectFit : 'fill';
  if (objectFit !== 'contain') return rect;

  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  if (!naturalWidth || !naturalHeight) return rect;

  const elementRatio = rect.width / rect.height;
  const imageRatio = naturalWidth / naturalHeight;

  if (imageRatio > elementRatio) {
    const height = rect.width / imageRatio;
    const top = rect.top + (rect.height - height) / 2;
    return new DOMRect(rect.left, top, rect.width, height);
  }

  const width = rect.height * imageRatio;
  const left = rect.left + (rect.width - width) / 2;
  return new DOMRect(left, rect.top, width, rect.height);
}

function getTagImageRect(overlayEl: HTMLElement | null): DOMRect | null {
  const frame = overlayEl?.parentElement;
  const img = frame?.querySelector('img');
  if (img instanceof HTMLImageElement) {
    const contentRect = getRenderedImageContentRect(img);
    if (contentRect.width === 0 || contentRect.height === 0) return null;
    return contentRect;
  }
  const rect = overlayEl?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return null;
  return rect;
}

function clientPointToUnitTag(
  overlayEl: HTMLElement | null,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const rect = getTagImageRect(overlayEl);
  if (!rect) return null;
  return {
    x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
  };
}

type TagImageFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function measureTagImageFrame(overlayEl: HTMLElement | null): TagImageFrame | null {
  if (!overlayEl) return null;
  const overlayRect = overlayEl.getBoundingClientRect();
  const imgRect = getTagImageRect(overlayEl);
  if (!imgRect || overlayRect.width === 0 || overlayEl.offsetWidth === 0 || imgRect.width === 0) {
    return null;
  }
  const scaleX = overlayEl.offsetWidth / overlayRect.width;
  const scaleY = overlayEl.offsetHeight / overlayRect.height;
  return {
    left: (imgRect.left - overlayRect.left) * scaleX,
    top: (imgRect.top - overlayRect.top) * scaleY,
    width: imgRect.width * scaleX,
    height: imgRect.height * scaleY,
  };
}

function useTagImageFrame(overlayRef: React.RefObject<HTMLDivElement | null>) {
  const [frame, setFrame] = useState<TagImageFrame | null>(null);

  const updateFrame = useCallback(() => {
    const next = measureTagImageFrame(overlayRef.current);
    if (next) {
      setFrame(next);
    }
  }, [overlayRef]);

  useLayoutEffect(() => {
    updateFrame();
    const overlay = overlayRef.current;
    const img = overlay?.parentElement?.querySelector('img');
    const onLayout = () => {
      requestAnimationFrame(updateFrame);
    };
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(onLayout)
      : null;
    if (resizeObserver) {
      if (overlay instanceof HTMLElement) resizeObserver.observe(overlay);
      if (img instanceof HTMLElement) resizeObserver.observe(img);
    }
    if (img instanceof HTMLImageElement) {
      img.addEventListener('load', onLayout);
    }
    window.addEventListener('resize', onLayout);
    window.visualViewport?.addEventListener('resize', onLayout);
    return () => {
      resizeObserver?.disconnect();
      if (img instanceof HTMLImageElement) {
        img.removeEventListener('load', onLayout);
      }
      window.removeEventListener('resize', onLayout);
      window.visualViewport?.removeEventListener('resize', onLayout);
    };
  }, [updateFrame]);

  return frame;
}

function getTagAnchorClientPoint(
  overlayEl: HTMLElement | null,
  point: { x: number; y: number },
): { x: number; y: number } | null {
  const rect = getTagImageRect(overlayEl);
  if (!rect) return null;
  return {
    x: rect.left + point.x * rect.width,
    y: rect.top + point.y * rect.height,
  };
}

function layoutPhotoMemberTagPicker(
  anchorViewportX: number,
  anchorViewportY: number,
  pickerEl: HTMLElement,
  portalRoot: HTMLElement,
): { top: number; left: number; maxListHeight: number; position: 'fixed' | 'absolute' } {
  const margin = TAG_PICKER_MARGIN_PX;
  const gap = TAG_PICKER_GAP_PX;
  const vh = window.innerHeight;
  const w = pickerEl.offsetWidth;
  const h = pickerEl.offsetHeight;

  const { top, left, position } = layoutViewportAnchoredOverlay(
    anchorViewportX,
    anchorViewportY,
    w,
    h,
    portalRoot,
    { gap, margin },
  );

  const resultsEl = pickerEl.querySelector('[data-tag-picker-results]');
  const listTop = resultsEl?.getBoundingClientRect().top
    ?? pickerEl.querySelector('[data-tag-picker-input]')?.getBoundingClientRect().bottom
    ?? top + 72;
  const maxListHeight = Math.max(
    64,
    Math.min(TAG_PICKER_DEFAULT_LIST_MAX_PX, vh - margin - listTop),
  );

  return { top, left, maxListHeight, position };
}

export function notifyPhotoMemberTags(photoId: string) {
  window.dispatchEvent(new CustomEvent(TAGS_EVENT, { detail: photoId }));
}

function usePhotoMemberTags(
  photoId: string | undefined,
  initialMemberTags?: PhotoMemberTag[],
) {
  const serverSnapshot = useRef({
    tags: initialMemberTags ?? [],
    canEdit: false,
    viewerId: null as string | null,
    loaded: false,
  });
  serverSnapshot.current.tags = initialMemberTags ?? [];

  const clientState = useSyncExternalStore(
    (listener) => subscribePhotoMemberTags(photoId, listener),
    () => getPhotoMemberTagsClientState(photoId),
    () => serverSnapshot.current,
  );

  const load = useCallback(async () => {
    if (!photoId) return;
    const response = await fetch(`/api/photos/${photoId}/member-tags`);
    if (!response.ok) {
      updatePhotoMemberTagsClientState(photoId, { loaded: true });
      return;
    }
    const data = await response.json();
    updatePhotoMemberTagsClientState(photoId, {
      tags: data.tags ?? [],
      canEdit: Boolean(data.canEdit),
      viewerId: data.viewerId ?? null,
      loaded: true,
    });
  }, [photoId]);

  useEffect(() => {
    if (!photoId) return;
    if (!getPhotoMemberTagsClientState(photoId).loaded) {
      void load();
    }
  }, [photoId, load]);

  useEffect(() => {
    const onChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === photoId) void load();
    };
    window.addEventListener(TAGS_EVENT, onChange);
    return () => window.removeEventListener(TAGS_EVENT, onChange);
  }, [load, photoId]);

  const tags = clientState.loaded ? clientState.tags : (initialMemberTags ?? clientState.tags);
  const canEdit = clientState.canEdit;
  const viewerId = clientState.viewerId;
  const loaded = clientState.loaded || Boolean(initialMemberTags);

  return { tags, canEdit, viewerId, loaded, reload: load };
}

export type PhotoMemberTagLayerHandle = {
  save: () => Promise<{ ok: true } | { ok: false; message: string }>;
  hasUnsavedChanges: () => boolean;
};

const TAG_DOT_CHROME_STAGGER_MS = 100;
const TAG_DOT_CHROME_TRANSITION_MS = 300;

function TagDot({
  tag,
  chromeOpacity = 1,
  chromePointerEvents = 'auto',
  chromeStaggerIndex = 0,
  onDotEnter,
  onDotLeave,
  editable = false,
  actionMenuOpen = false,
  onOpenMenu,
  onDragPosition,
  onDragEnd,
  onPointerActivate,
}: {
  tag: PhotoMemberTag;
  chromeOpacity?: number;
  chromePointerEvents?: 'auto' | 'none';
  /** Stagger scale/opacity chrome on the public photo stage (0 = first dot). */
  chromeStaggerIndex?: number;
  onDotEnter?: () => void;
  onDotLeave?: () => void;
  editable?: boolean;
  /** While the edit/remove menu is open, clicks should not drag the dot. */
  actionMenuOpen?: boolean;
  onOpenMenu?: (tag: PhotoMemberTag) => void;
  onDragPosition?: (tagId: string, position: { x: number; y: number }) => void;
  onDragEnd?: () => void;
  onPointerActivate?: () => void;
}) {
  const chromeVisible = chromeOpacity > 0;
  const chromeDelayMs = chromeStaggerIndex * TAG_DOT_CHROME_STAGGER_MS;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    dragged: boolean;
  } | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const dragPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => () => {
    dragCleanupRef.current?.();
    dragCleanupRef.current = null;
  }, []);

  useEffect(() => {
    if (!dragPoint) return;
    const dx = Math.abs(tag.x - dragPoint.x);
    const dy = Math.abs(tag.y - dragPoint.y);
    if (dx < 1e-5 && dy < 1e-5) {
      dragPointRef.current = null;
      setDragPoint(null);
    }
  }, [tag.x, tag.y, dragPoint]);

  const displayName = `@${tag.nickname}`;
  const anchorX = dragPoint?.x ?? tag.x;
  const anchorY = dragPoint?.y ?? tag.y;

  const sharedButtonHandlers = {
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      const wasDrag = dragStateRef.current?.dragged === true;
      dragStateRef.current = null;
      if (wasDrag) return;
      if (editable && onOpenMenu) {
        onOpenMenu(tag);
      }
    },
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onPointerActivate?.();
      if (!editable || !onDragPosition || actionMenuOpen) return;
      dragCleanupRef.current?.();

      const state = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: tag.x,
        originY: tag.y,
        dragged: false,
      };
      dragStateRef.current = state;
      const button = buttonRef.current;
      const overlay = button?.closest('[data-photo-member-tag-overlay]');

      const pointFromPointer = (clientX: number, clientY: number) => {
        const rect = getTagImageRect(overlay instanceof HTMLElement ? overlay : null);
        if (!rect) return null;
        return {
          x: Math.min(1, Math.max(0, state.originX + (clientX - state.startX) / rect.width)),
          y: Math.min(1, Math.max(0, state.originY + (clientY - state.startY) / rect.height)),
        };
      };

      const onMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== state.pointerId) return;
        const dx = moveEvent.clientX - state.startX;
        const dy = moveEvent.clientY - state.startY;
        if (!state.dragged && Math.hypot(dx, dy) < TAG_DRAG_THRESHOLD_PX) return;
        if (!state.dragged) {
          state.dragged = true;
          button?.setPointerCapture(moveEvent.pointerId);
        }
        const unit = pointFromPointer(moveEvent.clientX, moveEvent.clientY);
        if (unit) {
          dragPointRef.current = unit;
          setDragPoint(unit);
        }
      };

      const endDrag = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== state.pointerId) return;
        if (button?.hasPointerCapture(endEvent.pointerId)) {
          button.releasePointerCapture(endEvent.pointerId);
        }
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);
        dragCleanupRef.current = null;
        const finalPoint = dragPointRef.current;
        if (state.dragged) {
          onDragEnd?.();
          if (finalPoint) {
            setDragPoint(finalPoint);
            onDragPosition(tag.id, finalPoint);
            return;
          }
        }
        dragPointRef.current = null;
        setDragPoint(null);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      dragCleanupRef.current = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);
      };
    },
  };

  const chromeStyle: React.CSSProperties = editable
    ? {
      opacity: chromeOpacity,
      pointerEvents: chromePointerEvents === 'none' ? 'none' : 'auto',
    }
    : {
      opacity: chromeOpacity,
      transform: chromeVisible ? 'scale(1)' : 'scale(0)',
      transitionProperty: 'opacity, transform',
      transitionDuration: `${TAG_DOT_CHROME_TRANSITION_MS}ms`,
      transitionDelay: `${chromeDelayMs}ms`,
      pointerEvents: chromePointerEvents === 'none' ? 'none' : 'auto',
    };

  const viewButton = (
    <button
      ref={buttonRef}
      type="button"
      aria-label={`Tagged ${tag.nickname}`}
      className="flex size-10 cursor-pointer items-center justify-center p-0 origin-center touch-manipulation motion-reduce:transition-none"
      style={chromeStyle}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span
        className="size-4 rounded-full border-2 border-white bg-primary shadow"
        aria-hidden
      />
    </button>
  );

  return (
    <span
      className={clsx(
        'absolute z-20 -translate-x-1/2 -translate-y-1/2',
        editable ? 'size-4' : 'size-10',
      )}
      style={{
        left: `${anchorX * 100}%`,
        top: `${anchorY * 100}%`,
        pointerEvents: editable ? 'auto' : chromePointerEvents,
      }}
      onMouseEnter={onDotEnter}
      onMouseLeave={onDotLeave}
      onFocus={onDotEnter}
      onBlur={onDotLeave}
    >
      {editable ? (
        <button
          ref={buttonRef}
          type="button"
          aria-label={`Tagged ${tag.nickname}`}
          className={clsx(
            'relative size-4 p-0 origin-center motion-reduce:transition-none',
            'cursor-grab active:cursor-grabbing',
          )}
          style={chromeStyle}
          {...sharedButtonHandlers}
        >
          <span
            className={clsx(
              'absolute bottom-full left-1/2 z-10 mb-2 max-w-xs -translate-x-1/2 truncate text-center',
              tooltipSurfaceClassName,
            )}
            title={displayName}
          >
            {displayName}
          </span>
          <span
            className="block size-4 rounded-full border-2 border-white bg-primary shadow"
            aria-hidden
          />
        </button>
      ) : (
        <MemberHoverCard
          nickname={tag.nickname}
          fullName={tag.fullName}
          avatarUrl={tag.avatarUrl}
        >
          {viewButton}
        </MemberHoverCard>
      )}
    </span>
  );
}

function PendingPlacementPoint({
  point,
  onMove,
  onRelease,
}: {
  point: { x: number; y: number };
  onMove: (next: { x: number; y: number }) => void;
  onRelease: (next: { x: number; y: number }, dragged: boolean) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const pointRef = useRef(point);
  pointRef.current = point;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;

  useEffect(() => () => {
    dragCleanupRef.current?.();
    dragCleanupRef.current = null;
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      data-pending-tag-point=""
      aria-label="Move tag placement"
      className="absolute z-30 size-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-primary/70 active:cursor-grabbing"
      style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
      onPointerDown={(event) => {
        event.stopPropagation();
        dragCleanupRef.current?.();

        const origin = pointRef.current;
        const state = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: origin.x,
          originY: origin.y,
          dragged: false,
          lastPoint: origin,
        };
        const button = buttonRef.current;
        const overlay = button?.closest('[data-photo-member-tag-overlay]');

        const pointFromPointer = (clientX: number, clientY: number) => {
          const rect = getTagImageRect(overlay instanceof HTMLElement ? overlay : null);
          if (!rect) return null;
          return {
            x: Math.min(1, Math.max(0, state.originX + (clientX - state.startX) / rect.width)),
            y: Math.min(1, Math.max(0, state.originY + (clientY - state.startY) / rect.height)),
          };
        };

        const onPointerMove = (moveEvent: PointerEvent) => {
          if (moveEvent.pointerId !== state.pointerId) return;
          const dx = moveEvent.clientX - state.startX;
          const dy = moveEvent.clientY - state.startY;
          if (!state.dragged && Math.hypot(dx, dy) < TAG_DRAG_THRESHOLD_PX) return;
          if (!state.dragged) {
            state.dragged = true;
            button?.setPointerCapture(moveEvent.pointerId);
          }
          const unit = pointFromPointer(moveEvent.clientX, moveEvent.clientY);
          if (unit) {
            state.lastPoint = unit;
            onMoveRef.current(unit);
          }
        };

        const endDrag = (endEvent: PointerEvent) => {
          if (endEvent.pointerId !== state.pointerId) return;
          if (button?.hasPointerCapture(endEvent.pointerId)) {
            button.releasePointerCapture(endEvent.pointerId);
          }
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', endDrag);
          window.removeEventListener('pointercancel', endDrag);
          dragCleanupRef.current = null;
          onReleaseRef.current(state.lastPoint, state.dragged);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);
        dragCleanupRef.current = () => {
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', endDrag);
          window.removeEventListener('pointercancel', endDrag);
        };
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    />
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
  /** Stage edits locally and expose `save()` on the ref (tagging modal). */
  saveOnDone?: boolean;
  /** Server-provided tags — skips the initial GET when hydrated from the page loader. */
  initialMemberTags?: PhotoMemberTag[];
  onTagModeChange?: (active: boolean) => void;
  /** Fires when staged tag edits differ from the last saved snapshot. */
  onDirtyChange?: (dirty: boolean) => void;
  /** When false, discard staged edits and restore the last saved tags (hidden tagging modal). */
  isActive?: boolean;
};

export const PhotoMemberTagLayer = forwardRef<PhotoMemberTagLayerHandle, PhotoMemberTagLayerProps>(
  function PhotoMemberTagLayer({
    photoId,
    allowPlacement = false,
    showPlacementControl = true,
    autoTagMode = false,
    hideInlineHints = false,
    saveOnDone = false,
    initialMemberTags,
    onTagModeChange,
    onDirtyChange,
    isActive = true,
  }, ref) {
    const tagIdleReveal = usePhotoTagIdleReveal();
    const { tags: serverTags, canEdit, loaded } = usePhotoMemberTags(photoId, initialMemberTags);
    const baselineRef = useRef<PhotoMemberTag[] | null>(null);
    const [draftTags, setDraftTags] = useState<PhotoMemberTag[] | null>(null);
    const draftInitializedRef = useRef(false);
    const draftPhotoIdRef = useRef(photoId);
    const suppressOverlayClickRef = useRef(false);
    const serverTagsRef = useRef(serverTags);
    serverTagsRef.current = serverTags;

    useLayoutEffect(() => {
      if (draftPhotoIdRef.current !== photoId) {
        draftPhotoIdRef.current = photoId;
        draftInitializedRef.current = false;
        baselineRef.current = null;
      }

      if (!saveOnDone) return;

      if (!isActive) {
        draftInitializedRef.current = false;
        if (!loaded) return;
        const snapshot = serverTags.map((tag) => ({ ...tag }));
        baselineRef.current = snapshot;
        setDraftTags(snapshot);
        return;
      }

      if (!loaded || draftInitializedRef.current) return;
      const snapshot = serverTags.map((tag) => ({ ...tag }));
      baselineRef.current = snapshot;
      setDraftTags(snapshot);
      draftInitializedRef.current = true;
    }, [saveOnDone, loaded, serverTags, photoId, isActive]);

    useEffect(() => {
      if (!saveOnDone) {
        onDirtyChange?.(false);
        return;
      }
      const dirty = Boolean(
        baselineRef.current
        && draftTags
        && !photoMemberTagsSnapshotEqual(baselineRef.current, draftTags),
      );
      onDirtyChange?.(dirty);
    }, [saveOnDone, draftTags, onDirtyChange]);

    const tags = saveOnDone ? (draftTags ?? serverTags) : serverTags;
    const [tagMode, setTagMode] = useState(autoTagMode);
    const fadeTagDots = !allowPlacement && !tagMode && Boolean(tagIdleReveal);
    const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
    const [query, setQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [editingTagId, setEditingTagId] = useState<string | null>(null);
    const [tagActionMenuTagId, setTagActionMenuTagId] = useState<string | null>(null);

    useLayoutEffect(() => {
      if (!saveOnDone || isActive) return;
      setPoint(null);
      setQuery('');
      setHighlightedIndex(0);
      setError(null);
      setEditingTagId(null);
      setTagActionMenuTagId(null);
    }, [saveOnDone, isActive]);

    const tagActionMenuRef = useRef<HTMLDivElement>(null);
    const [tagMenuLayout, setTagMenuLayout] = useState<{
      top: number;
      left: number;
      position: 'fixed' | 'absolute';
    } | null>(null);
    const [pickerLayout, setPickerLayout] = useState<{
      top: number;
      left: number;
      maxListHeight: number;
      position: 'fixed' | 'absolute';
    } | null>(null);
    const tagOverlayRef = useRef<HTMLDivElement>(null);
    const tagImageFrame = useTagImageFrame(tagOverlayRef);
    const tagPickerRef = useRef<HTMLDivElement>(null);
    const tagSearchInputRef = useRef<HTMLInputElement>(null);
    const mentionQuery = point && query.trim().length > 0 ? query : null;
    const { results, loading } = useMentionSearch(mentionQuery);
    const taggedProfileIds = new Set(
      tags
        .filter((tag) => tag.id !== editingTagId)
        .map((tag) => tag.profileId),
    );
    const pickerResults = results.filter((profile) => !taggedProfileIds.has(profile.id));

    useImperativeHandle(ref, () => ({
      hasUnsavedChanges: () => {
        if (!saveOnDone || !baselineRef.current || !draftTags) return false;
        return !photoMemberTagsSnapshotEqual(baselineRef.current, draftTags);
      },
      save: async () => {
        if (!saveOnDone) {
          return { ok: true as const };
        }
        if (!draftTags || !baselineRef.current) {
          return { ok: false, message: 'Tags are still loading' };
        }
        if (photoMemberTagsSnapshotEqual(baselineRef.current, draftTags)) {
          return { ok: true as const };
        }
        const result = await persistPhotoMemberTags(photoId, baselineRef.current, draftTags);
        if (!result.ok) return result;
        const refresh = await fetch(`/api/photos/${photoId}/member-tags`);
        if (refresh.ok) {
          const data = await refresh.json();
          const snapshot = (data.tags ?? []) as PhotoMemberTag[];
          baselineRef.current = snapshot.map((tag) => ({ ...tag }));
          setDraftTags(snapshot.map((tag) => ({ ...tag })));
        } else {
          const snapshot = draftTags.map((tag) => ({ ...tag }));
          baselineRef.current = snapshot;
        }
        return { ok: true as const };
      },
    }), [draftTags, photoId, saveOnDone]);

    const suppressNextOverlayClick = useCallback(() => {
      suppressOverlayClickRef.current = true;
    }, []);

    const cancelPlacement = useCallback(() => {
      setPoint(null);
      setQuery('');
      setEditingTagId(null);
      setError(null);
      setHighlightedIndex(0);
    }, []);

    const updateDraftTagPosition = useCallback((tagId: string, position: { x: number; y: number }) => {
      if (!saveOnDone) return;
      setDraftTags((current) => {
        const list = current ?? serverTagsRef.current;
        return list.map((tag) => (
          tag.id === tagId ? { ...tag, x: position.x, y: position.y } : tag
        ));
      });
    }, [saveOnDone]);

    const removeDraftTag = useCallback((tagId: string) => {
      if (!saveOnDone) return;
      setDraftTags((current) => (current ?? []).filter((tag) => tag.id !== tagId));
    }, [saveOnDone]);

    const openTagActionMenu = useCallback((tag: PhotoMemberTag) => {
      setTagActionMenuTagId(tag.id);
    }, []);

    const updateTagMenuLayout = useCallback(() => {
      if (!tagActionMenuTagId || !tagActionMenuRef.current || !tagOverlayRef.current) {
        setTagMenuLayout(null);
        return;
      }
      const tag = tags.find((item) => item.id === tagActionMenuTagId);
      if (!tag) {
        setTagMenuLayout(null);
        return;
      }
      const portalRoot = getOverlayPortalRoot(tagOverlayRef.current) ?? document.body;
      const anchor = getTagAnchorClientPoint(tagOverlayRef.current, { x: tag.x, y: tag.y });
      if (!anchor) {
        setTagMenuLayout(null);
        return;
      }
      setTagMenuLayout(
        layoutViewportAnchoredOverlay(
          anchor.x,
          anchor.y,
          tagActionMenuRef.current.offsetWidth,
          tagActionMenuRef.current.offsetHeight,
          portalRoot,
          { gap: TAG_PICKER_GAP_PX, margin: TAG_PICKER_MARGIN_PX },
        ),
      );
    }, [tagActionMenuTagId, tags]);

    useLayoutEffect(() => {
      if (!tagActionMenuTagId) {
        setTagMenuLayout(null);
        return;
      }
      updateTagMenuLayout();
      const onViewportChange = () => {
        requestAnimationFrame(() => updateTagMenuLayout());
      };
      window.addEventListener('resize', onViewportChange);
      window.visualViewport?.addEventListener('resize', onViewportChange);
      window.visualViewport?.addEventListener('scroll', onViewportChange);
      return () => {
        window.removeEventListener('resize', onViewportChange);
        window.visualViewport?.removeEventListener('resize', onViewportChange);
        window.visualViewport?.removeEventListener('scroll', onViewportChange);
      };
    }, [tagActionMenuTagId, updateTagMenuLayout]);

    useLayoutEffect(() => {
      if (!tagActionMenuTagId) return;
      requestAnimationFrame(() => updateTagMenuLayout());
    }, [tagActionMenuTagId, tags, updateTagMenuLayout]);

    useEffect(() => {
      if (!tagActionMenuTagId) return;
      const onPointerDown = (event: PointerEvent) => {
        if (tagActionMenuRef.current?.contains(event.target as Node)) return;
        setTagActionMenuTagId(null);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setTagActionMenuTagId(null);
      };
      window.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('keydown', onKeyDown);
      return () => {
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('keydown', onKeyDown);
      };
    }, [tagActionMenuTagId]);

    const updatePickerLayout = useCallback(() => {
      if (!point || !tagPickerRef.current || !tagOverlayRef.current) {
        setPickerLayout(null);
        return;
      }
      const portalRoot = getOverlayPortalRoot(tagOverlayRef.current) ?? document.body;
      const anchor = getTagAnchorClientPoint(tagOverlayRef.current, point);
      if (!anchor) {
        setPickerLayout(null);
        return;
      }
      setPickerLayout(
        layoutPhotoMemberTagPicker(anchor.x, anchor.y, tagPickerRef.current, portalRoot),
      );
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
      const overlay = tagOverlayRef.current;
      if (!overlay) return;
      const dialog = overlay.closest('dialog');
      if (!(dialog instanceof HTMLDialogElement)) return;

      const dismissPicker = () => {
        setPoint(null);
        setQuery('');
        setPickerLayout(null);
      };

      dialog.addEventListener('close', dismissPicker);
      const observer = new MutationObserver(() => {
        if (!dialog.open) {
          dismissPicker();
        }
      });
      observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });

      return () => {
        dialog.removeEventListener('close', dismissPicker);
        observer.disconnect();
      };
    }, []);

    useEffect(() => {
      if (!point) return;

      const onPointerDown = (event: PointerEvent) => {
        if (query.trim()) return;
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (tagPickerRef.current?.contains(target)) return;
        if (tagOverlayRef.current?.contains(target)) return;
        cancelPlacement();
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        cancelPlacement();
      };

      const dialog = tagOverlayRef.current?.closest('dialog');
      const onDialogCancel = (event: Event) => {
        event.preventDefault();
        cancelPlacement();
      };

      document.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('keydown', onKeyDown, true);
      dialog?.addEventListener('cancel', onDialogCancel);
      return () => {
        document.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('keydown', onKeyDown, true);
        dialog?.removeEventListener('cancel', onDialogCancel);
      };
    }, [point, query, cancelPlacement]);

    useEffect(() => {
      if (!tagMode || autoTagMode) return;
      const onKey = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' || point) return;
        setTagMode(false);
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [tagMode, autoTagMode, point]);

    const placeTag = async (profile: MentionProfile) => {
      if (!point) return;
      setError(null);

      if (saveOnDone) {
        if (taggedProfileIds.has(profile.id)) {
          setError('That member is already tagged on this photo');
          return;
        }
        if (editingTagId) {
          setDraftTags((current) => (current ?? []).map((tag) => (
            tag.id === editingTagId
              ? {
                ...tag,
                profileId: profile.id,
                nickname: profile.nickname,
                fullName: profile.full_name,
                avatarUrl: profile.avatar_url,
              }
              : tag
          )));
          setEditingTagId(null);
        } else {
          setDraftTags((current) => [
            ...(current ?? []),
            createDraftPhotoMemberTag(profile, point.x, point.y),
          ]);
        }
        setPoint(null);
        setQuery('');
        return;
      }

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
          data-photo-member-tag-overlay=""
          className={clsx(
            'absolute inset-0 overflow-visible',
            tagMode && 'z-10 cursor-crosshair',
          )}
          style={{ pointerEvents: tagMode || (saveOnDone && canEdit) ? 'auto' : 'none' }}
          onClick={(event) => {
            if (!tagMode) {
              return;
            }
            if (suppressOverlayClickRef.current) {
              suppressOverlayClickRef.current = false;
              return;
            }
            if (tagActionMenuTagId) {
              setTagActionMenuTagId(null);
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (point) {
              if (!query.trim()) cancelPlacement();
              return;
            }
            const unit = clientPointToUnitTag(event.currentTarget, event.clientX, event.clientY);
            if (!unit) return;
            setEditingTagId(null);
            setPoint(unit);
            setQuery('');
            setHighlightedIndex(0);
          }}
        >
          <div
            data-photo-member-tag-image=""
            className="absolute overflow-visible"
            style={tagImageFrame ? {
              left: tagImageFrame.left,
              top: tagImageFrame.top,
              width: tagImageFrame.width,
              height: tagImageFrame.height,
            } : {
              inset: 0,
            }}
          >
            {tags.map((tag, index) => (
              <TagDot
                key={tag.id}
                tag={tag}
                chromeOpacity={fadeTagDots ? (tagIdleReveal?.opacity ?? 1) : 1}
                chromePointerEvents={fadeTagDots ? (tagIdleReveal?.pointerEvents ?? 'auto') : 'auto'}
                chromeStaggerIndex={fadeTagDots ? index : 0}
                onDotEnter={fadeTagDots ? tagIdleReveal?.onPillEnter : undefined}
                onDotLeave={fadeTagDots ? tagIdleReveal?.onPillLeave : undefined}
                editable={saveOnDone && canEdit}
                actionMenuOpen={tagActionMenuTagId === tag.id}
                onOpenMenu={saveOnDone && canEdit ? openTagActionMenu : undefined}
                onDragPosition={saveOnDone && canEdit ? updateDraftTagPosition : undefined}
                onDragEnd={saveOnDone && canEdit ? suppressNextOverlayClick : undefined}
                onPointerActivate={point && !query.trim() ? cancelPlacement : undefined}
              />
            ))}
            {point ? (
              <PendingPlacementPoint
                point={point}
                onMove={setPoint}
                onRelease={(next, dragged) => {
                  suppressNextOverlayClick();
                  if (dragged) {
                    setPoint(next);
                    return;
                  }
                  if (!query.trim()) cancelPlacement();
                }}
              />
            ) : null}
          </div>
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
        {point
          && typeof document !== 'undefined'
          && shouldShowPortalOverlay(tagOverlayRef.current)
          ? createPortal(
            <div
              ref={tagPickerRef}
              {...{ [PORTAL_OVERLAY_ATTR]: '' }}
              className={clsx(
                pickerLayout?.position ?? 'fixed',
                'w-56 rounded-md border border-border-color bg-background p-2 shadow-lg',
                modalPopoverZClassName,
                !pickerLayout && 'invisible',
              )}
              style={{
                top: pickerLayout?.top ?? 0,
                left: pickerLayout?.left ?? 0,
              }}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
            >
              <div
                className="flex items-center gap-1"
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
                    if (event.key === 'ArrowDown' && pickerResults.length > 0) {
                      event.preventDefault();
                      setHighlightedIndex((index) => (index + 1) % pickerResults.length);
                    } else if (event.key === 'ArrowUp' && pickerResults.length > 0) {
                      event.preventDefault();
                      setHighlightedIndex((index) => (index - 1 + pickerResults.length) % pickerResults.length);
                    } else if (event.key === 'Enter' && pickerResults[highlightedIndex]) {
                      event.preventDefault();
                      void placeTag(pickerResults[highlightedIndex]);
                    } else if (event.key === 'Escape') {
                      event.preventDefault();
                      event.stopPropagation();
                      cancelPlacement();
                    }
                  }}
                  placeholder="Search by nickname"
                  className="min-w-0 flex-1 rounded border border-border-color bg-background-medium px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  aria-label="Cancel tag"
                  title="Cancel"
                  className="shrink-0 rounded p-2 -mr-0.5 text-foreground/70 hover:bg-background-medium hover:text-foreground"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    cancelPlacement();
                  }}
                >
                  <CloseSVG
                    className="size-3.5 fill-current"
                  />
                </button>
              </div>
              {error ? <p
                className="mt-1 text-xs text-red-500"
              >{error}</p> : null}
              {editingTagId ? (
                <p
                  className="mt-1 text-xs text-foreground/70"
                >
                  Pick a different member for this tag.
                </p>
              ) : null}
              {loading || pickerResults.length > 0 ? (
                <div
                  data-tag-picker-results
                  className="mt-1 overflow-y-auto overscroll-contain"
                  style={{ maxHeight: pickerLayout?.maxListHeight ?? TAG_PICKER_DEFAULT_LIST_MAX_PX }}
                >
                  {loading ? <p
                    className="px-1 py-1 text-xs text-foreground/60"
                  >Searching…</p> : null}
                  {pickerResults.map((profile, index) => (
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
        {tagActionMenuTagId
          && typeof document !== 'undefined'
          && shouldShowPortalOverlay(tagOverlayRef.current)
          ? createPortal(
            <div
              ref={tagActionMenuRef}
              {...{ [PORTAL_OVERLAY_ATTR]: '' }}
              className={clsx(
                tagMenuLayout?.position ?? 'fixed',
                'w-56 min-w-40 rounded-md border border-border-color bg-background py-1 shadow-lg',
                modalPopoverZClassName,
                !tagMenuLayout && 'invisible',
              )}
              style={{
                top: tagMenuLayout?.top ?? 0,
                left: tagMenuLayout?.left ?? 0,
              }}
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-background-medium"
                onClick={() => {
                  const tag = tags.find((item) => item.id === tagActionMenuTagId);
                  if (!tag) return;
                  setTagActionMenuTagId(null);
                  setPoint({ x: tag.x, y: tag.y });
                  setEditingTagId(tag.id);
                  setQuery(tag.nickname);
                  setHighlightedIndex(0);
                }}
              >
                Edit tag
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-background-medium"
                onClick={() => {
                  removeDraftTag(tagActionMenuTagId);
                  setTagActionMenuTagId(null);
                }}
              >
                Remove tag
              </button>
            </div>,
            getOverlayPortalRoot(tagOverlayRef.current) ?? document.body,
          ) : null}
      </>
    );
  });

export function PhotoMemberTagList({
  photoId,
  photo,
  className,
  hideHeading = false,
  initialMemberTags,
}: {
  photoId: string;
  /** When set and the viewer can edit, shows a control to open the tagging modal. */
  photo?: PhotoWithAlbums;
  className?: string;
  hideHeading?: boolean;
  initialMemberTags?: PhotoMemberTag[];
}) {
  const { tags, canEdit } = usePhotoMemberTags(photoId, initialMemberTags);
  const openPhotoMemberTagsModal = useOpenPhotoMemberTagsModal();
  const showEditLink = canEdit && photo;
  if (tags.length === 0 && !showEditLink) return null;

  return (
    <div
      className={clsx('mb-4', className)}
    >
      {hideHeading ? null : (
        <DetailSidebarSectionHeading>
          Tagged people
        </DetailSidebarSectionHeading>
      )}
      <div
        className="flex min-w-0 flex-wrap items-center gap-1.5"
      >
        {tags.map((tag) => (
          <MemberHoverCard
            key={tag.id}
            nickname={tag.nickname}
            fullName={tag.fullName}
            avatarUrl={tag.avatarUrl}
          >
            <Link
              href={`/@${tag.nickname}`}
              className="group inline-flex min-w-0 max-w-full items-center gap-1.5 text-sm hover:text-primary"
            >
              <Avatar
                avatarUrl={tag.avatarUrl}
                fullName={tag.fullName}
                nickname={tag.nickname}
                size="xs"
              />
              <span
                className="truncate"
              >
                @
                {tag.nickname}
              </span>
            </Link>
          </MemberHoverCard>
        ))}
        {showEditLink ? (
          <button
            type="button"
            className="inline-flex h-5 shrink-0 items-center justify-center rounded-full border border-border-color-strong bg-background-raised px-2 text-xs text-foreground/60 transition-colors hover:border-primary hover:bg-primary/5 hover:text-foreground"
            onClick={() => openPhotoMemberTagsModal(photo)}
          >
            Tag people
          </button>
        ) : null}
      </div>
    </div>
  );
}
