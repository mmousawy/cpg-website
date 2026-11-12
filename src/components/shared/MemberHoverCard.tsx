'use client';

import Avatar from '@/components/auth/Avatar';
import { pageFloatingZClassName } from '@/components/layout/mobileChrome';
import FollowButton from '@/components/profile/FollowButton';
import BlurImage from '@/components/shared/BlurImage';
import {
  fetchMemberPreview,
  getCachedMemberPreview,
  type MemberPreview,
} from '@/lib/members/fetchMemberPreview';
import { subscribeRouteChange } from '@/lib/routeChange';
import { getProfileBannerColors } from '@/utils/profileBannerColor';
import { motionDuration } from '@/utils/reduceMotion';
import clsx from 'clsx';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 150;
const CARD_MOTION_MS = 150;
const CARD_GAP_PX = 8;
const VIEWPORT_PADDING_PX = 8;
const BANNER_BLURHASH_WIDTH = 32;
const BANNER_BLURHASH_HEIGHT = Math.round(BANNER_BLURHASH_WIDTH / 3.2);

type MemberHoverCardProps = {
  nickname: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  children: React.ReactElement;
};

function canUseHoverCard(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function formatCount(count: number): string {
  return count.toLocaleString();
}

function getDisplayName(fullName: string | null | undefined, nickname: string): string {
  const name = fullName?.trim();
  if (name) return name;
  return `@${nickname}`;
}

function useMemberPreview(nickname: string, enabled: boolean) {
  const [, bump] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (getCachedMemberPreview(nickname) !== undefined) return;

    let cancelled = false;
    void fetchMemberPreview(nickname).then(() => {
      if (!cancelled) bump((n) => n + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, nickname]);

  const cached = getCachedMemberPreview(nickname);
  return {
    preview: cached ?? null,
    isLoading: enabled && cached === undefined,
  };
}

function formatStatParts(preview: MemberPreview | null): string[] {
  if (!preview) return [];

  const parts: string[] = [];
  const photoCount = preview.photoCount ?? 0;
  const albumCount = preview.albumCount ?? 0;
  const followerCount = preview.followerCount ?? 0;
  const followingCount = preview.followingCount ?? 0;

  parts.push(`${formatCount(photoCount)} ${photoCount === 1 ? 'photo' : 'photos'}`);
  if (albumCount > 0) {
    parts.push(`${formatCount(albumCount)} ${albumCount === 1 ? 'album' : 'albums'}`);
  }
  if (followerCount > 0) {
    parts.push(`${formatCount(followerCount)} ${followerCount === 1 ? 'follower' : 'followers'}`);
  }
  if (followingCount > 0) {
    parts.push(`${formatCount(followingCount)} following`);
  }
  return parts;
}

function MemberHoverCardPanel({
  nickname,
  fullName,
  avatarUrl,
  preview,
  isLoading,
}: {
  nickname: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  preview: MemberPreview | null;
  isLoading: boolean;
}) {
  const resolvedName = getDisplayName(preview?.full_name ?? fullName, nickname);
  const resolvedAvatar = preview?.avatar_url ?? avatarUrl ?? null;
  const profileHref = `/@${nickname}`;
  const bannerUrl = preview?.banner_url ?? null;
  const solidBannerColors = getProfileBannerColors(nickname);
  const statParts = formatStatParts(preview);
  const bio = preview?.bio?.trim() || null;
  const gearLine = preview?.gearLine?.trim() || null;
  const gearHref = `/@${nickname}/gear`;

  return (
    <div
      className="relative w-72 overflow-hidden rounded-lg border border-border-color-strong bg-(--hover-card-bg) shadow-lg [--hover-card-bg:var(--background-float)] dark:[--hover-card-bg:var(--background)]"
      role="group"
      aria-label={resolvedName}
    >
      <div
        className="absolute inset-x-0 top-0 h-28 overflow-hidden"
      >
        {bannerUrl ? (
          <BlurImage
            src={bannerUrl}
            alt=""
            fill
            className="object-cover"
            sizes="288px"
            quality={75}
            blurhashWidth={BANNER_BLURHASH_WIDTH}
            blurhashHeight={BANNER_BLURHASH_HEIGHT}
            blurhash={preview?.banner_blurhash}
          />
        ) : (
          <div
            className="absolute inset-0 profile-hero-solid"
            style={{
              '--profile-banner-color-light': solidBannerColors.light,
              '--profile-banner-color-dark': solidBannerColors.dark,
            } as React.CSSProperties}
          />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(
              to top,
              var(--hover-card-bg) 0%,
              var(--hover-card-bg) 22%,
              color-mix(in srgb, var(--hover-card-bg) 82%, transparent) 48%,
              color-mix(in srgb, var(--hover-card-bg) 38%, transparent) 72%,
              transparent 100%
            )`,
          }}
        />
      </div>

      <div
        className="absolute top-3 right-3 z-10"
      >
        {isLoading ? (
          <div
            className="size-7.5 animate-pulse rounded-full bg-border-color"
          />
        ) : preview ? (
          <FollowButton
            profileId={preview.id}
            profileNickname={preview.nickname}
          />
        ) : null}
      </div>

      <div
        className="relative px-4 pt-5 pb-4"
      >
        <Link
          href={profileHref}
          className="group mb-2 flex min-w-0 items-center gap-3 pr-10"
        >
          <div
            className="size-14 shrink-0 overflow-hidden rounded-full border-2 border-[var(--hover-card-bg)]"
          >
            <Avatar
              avatarUrl={resolvedAvatar}
              fullName={resolvedName}
              nickname={nickname}
              size="fill"
              hoverEffect
            />
          </div>
          <span
            className="min-w-0 [text-shadow:0_1px_2px_rgba(0,0,0,0.8),0_0_10px_rgba(0,0,0,0.45)]"
          >
            <span
              className="block truncate font-heading text-lg font-bold leading-tight group-hover:text-primary"
            >
              {resolvedName}
            </span>
            <span
              className="block truncate text-sm leading-tight text-foreground dark:text-white group-hover:text-primary"
            >
              @
              {nickname}
            </span>
          </span>
        </Link>

        {isLoading ? (
          <div
            className="mt-2 h-3 w-40 animate-pulse rounded bg-border-color"
          />
        ) : statParts.length > 0 ? (
          <p
            className="mt-2 text-xs text-foreground/70"
          >
            {statParts.map((part, index) => (
              <span
                key={part}
              >
                {index > 0 && (
                  <span
                    aria-hidden
                  >
                    {' · '}
                  </span>
                )}
                {part}
              </span>
            ))}
          </p>
        ) : null}

        {isLoading ? (
          <div
            className="mt-2 space-y-1.5"
          >
            <div
              className="h-3 w-full animate-pulse rounded bg-border-color"
            />
            <div
              className="h-3 w-4/5 animate-pulse rounded bg-border-color"
            />
          </div>
        ) : bio ? (
          <p
            className="mt-2 whitespace-pre-line text-sm leading-snug text-foreground/90 line-clamp-3"
          >
            {bio}
          </p>
        ) : null}

        {gearLine && (
          <Link
            href={gearHref}
            className="mt-1.5 block truncate text-xs text-foreground/70 hover:text-primary"
          >
            {gearLine}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function MemberHoverCard({
  nickname,
  fullName,
  avatarUrl,
  children,
}: MemberHoverCardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number } | null>(null);
  const [wantsPreview, setWantsPreview] = useState(false);

  const anchorRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef(false);

  const { preview, isLoading } = useMemberPreview(nickname, wantsPreview || isMounted);

  const clearOpenTimer = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const clearExitTimer = () => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  };

  const dismiss = useCallback(() => {
    if (openRef.current) return;
    clearExitTimer();
    setEntered(false);
    setIsMounted(false);
    setCardPosition(null);
  }, []);

  const scheduleOpen = useCallback(() => {
    if (!canUseHoverCard()) return;
    clearCloseTimer();
    clearExitTimer();
    openRef.current = true;
    setWantsPreview(true);
    if (isMounted && cardPosition) {
      setEntered(true);
      return;
    }
    if (openTimerRef.current) return;
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      if (!openRef.current) return;
      setIsMounted(true);
    }, OPEN_DELAY_MS);
  }, [cardPosition, isMounted]);

  const scheduleClose = useCallback(() => {
    clearOpenTimer();
    openRef.current = false;
    if (closeTimerRef.current) return;
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setEntered(false);
      const motionMs = motionDuration(CARD_MOTION_MS);
      clearExitTimer();
      exitTimerRef.current = setTimeout(dismiss, motionMs === 0 ? 0 : motionMs + 40);
    }, CLOSE_DELAY_MS);
  }, [dismiss]);

  const updatePosition = useCallback(() => {
    const trigger = anchorRef.current?.firstElementChild;
    if (!trigger || !cardRef.current) return;

    const triggerRect = trigger.getBoundingClientRect();
    const cardRect = cardRef.current.getBoundingClientRect();
    if (cardRect.width === 0 || cardRect.height === 0) return;

    let left = triggerRect.left;
    let top = triggerRect.bottom + CARD_GAP_PX;

    if (top + cardRect.height > window.innerHeight - VIEWPORT_PADDING_PX) {
      const above = triggerRect.top - cardRect.height - CARD_GAP_PX;
      if (above >= VIEWPORT_PADDING_PX) {
        top = above;
      }
    }

    if (left + cardRect.width > window.innerWidth - VIEWPORT_PADDING_PX) {
      left = window.innerWidth - cardRect.width - VIEWPORT_PADDING_PX;
    }
    if (left < VIEWPORT_PADDING_PX) {
      left = VIEWPORT_PADDING_PX;
    }
    if (top < VIEWPORT_PADDING_PX) {
      top = VIEWPORT_PADDING_PX;
    }

    setCardPosition({ top, left });
  }, []);

  const handlePointerEnter = useCallback((event?: { buttons?: number }) => {
    if (event && event.buttons && event.buttons !== 0) return;
    scheduleOpen();
  }, [scheduleOpen]);

  const handlePointerLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  useEffect(() => {
    const trigger = anchorRef.current?.firstElementChild;
    if (!trigger) return;

    const onMouseEnter = (event: Event) => {
      if (!(event instanceof globalThis.MouseEvent)) return;
      handlePointerEnter(event);
    };
    const onFocusIn = () => {
      handlePointerEnter();
    };
    const onFocusOut = (event: Event) => {
      if (!(event instanceof globalThis.FocusEvent)) return;
      const next = event.relatedTarget;
      if (next instanceof Node && (trigger.contains(next) || cardRef.current?.contains(next))) {
        return;
      }
      handlePointerLeave();
    };

    trigger.addEventListener('mouseenter', onMouseEnter);
    trigger.addEventListener('mouseleave', handlePointerLeave);
    trigger.addEventListener('focusin', onFocusIn);
    trigger.addEventListener('focusout', onFocusOut);

    return () => {
      trigger.removeEventListener('mouseenter', onMouseEnter);
      trigger.removeEventListener('mouseleave', handlePointerLeave);
      trigger.removeEventListener('focusin', onFocusIn);
      trigger.removeEventListener('focusout', onFocusOut);
    };
  });

  useEffect(() => {
    if (!isMounted || !cardRef.current) return;
    const timeoutId = setTimeout(() => {
      updatePosition();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [isMounted, isLoading, preview, updatePosition]);

  const placed = cardPosition != null;
  useEffect(() => {
    if (!isMounted || !placed) return;
    const frame = setTimeout(() => {
      if (openRef.current) setEntered(true);
    }, 20);
    return () => clearTimeout(frame);
  }, [isMounted, placed]);

  useEffect(() => {
    if (!isMounted) return;

    const handleScroll = () => {
      openRef.current = false;
      clearOpenTimer();
      clearCloseTimer();
      clearExitTimer();
      setEntered(false);
      setIsMounted(false);
      setCardPosition(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      handleScroll();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('keydown', handleKeyDown);
    const unsubscribeRouteChange = subscribeRouteChange(handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('keydown', handleKeyDown);
      unsubscribeRouteChange();
    };
  }, [isMounted, updatePosition]);

  useEffect(() => {
    return () => {
      clearOpenTimer();
      clearCloseTimer();
      clearExitTimer();
    };
  }, []);

  const handleCardFocusOut = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    const trigger = anchorRef.current?.firstElementChild;
    if (next instanceof Node && (event.currentTarget.contains(next) || trigger?.contains(next))) {
      return;
    }
    handlePointerLeave();
  };

  return (
    <>
      <span
        ref={anchorRef}
        className="contents"
      >
        {children}
      </span>
      {isMounted &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={cardRef}
            className={clsx(
              'fixed',
              pageFloatingZClassName,
              'transition-[opacity,translate] duration-150 ease-out motion-reduce:transition-none',
              entered
                ? 'translate-y-0 opacity-100'
                : 'translate-y-1 opacity-0 motion-reduce:translate-none motion-reduce:opacity-100',
            )}
            style={
              cardPosition
                ? {
                  top: `${cardPosition.top}px`,
                  left: `${cardPosition.left}px`,
                }
                : { visibility: 'hidden' }
            }
            onMouseEnter={() => handlePointerEnter()}
            onMouseLeave={handlePointerLeave}
            onFocusCapture={() => handlePointerEnter()}
            onBlur={handleCardFocusOut}
          >
            <MemberHoverCardPanel
              nickname={nickname}
              fullName={fullName}
              avatarUrl={avatarUrl}
              preview={preview}
              isLoading={isLoading}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
