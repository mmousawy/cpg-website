'use client';

import Avatar from '@/components/auth/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useAlbumLikes, usePhotoLikes } from '@/hooks/useLikes';
import { toggleLike } from '@/lib/actions/likes';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import Link from 'next/link';
import HeartFilledIcon from 'public/icons/heart-filled.svg';
import HeartIcon from 'public/icons/heart.svg';
import { useEffect, useRef, useState } from 'react';
import styles from './LikeButton.module.css';
import Popover from './Popover';

interface DetailLikesSectionProps {
  entityType: 'photo' | 'album';
  entityId: string;
  className?: string;
  /** Initial likes count from server (from likes_count column) */
  initialCount?: number;
}

const MAX_VISIBLE_AVATARS = 5;

/**
 * Optimized likes section for detail pages.
 * - Shows count immediately from server-provided initialCount
 * - Fetches likers on mount to display stacked avatars
 * - Clicking avatars opens popover with full liker list
 */

export default function DetailLikesSection({ entityType, className, entityId, initialCount = 0 }: DetailLikesSectionProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const showAuthPrompt = useAuthPrompt();

  // Local state for optimistic updates - initialize with server count
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [isPending, setIsPending] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousLikedRef = useRef(false);

  // Popover state
  const [showLikers, setShowLikers] = useState(false);

  // Always fetch likes to show avatars (when there's an initial count)
  const shouldFetch = initialCount > 0 || count > 0;

  const photoLikesQuery = usePhotoLikes(
    entityType === 'photo' ? entityId : undefined,
    { enabled: entityType === 'photo' && shouldFetch },
  );
  const albumLikesQuery = useAlbumLikes(
    entityType === 'album' ? entityId : undefined,
    { enabled: entityType === 'album' && shouldFetch },
  );
  const likesQuery = entityType === 'photo' ? photoLikesQuery : albumLikesQuery;

  // Update local state when likes data is fetched
  useEffect(() => {
    if (likesQuery.data) {
      setLiked(likesQuery.data.userHasLiked);
      setCount(likesQuery.data.count);
    }
  }, [likesQuery.data]);

  // Trigger animation when liked changes from false to true
  useEffect(() => {
    if (liked && !previousLikedRef.current) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }
    previousLikedRef.current = liked;
  }, [liked]);

  const handleLikeClick = async () => {
    if (isPending) return;

    // Show auth prompt for non-authenticated users
    if (!user) {
      showAuthPrompt({
        feature: entityType === 'photo' ? 'like photos' : 'like albums',
      });
      return;
    }

    // Optimistic update
    const newLiked = !liked;
    const newCount = newLiked ? count + 1 : count - 1;
    setLiked(newLiked);
    setCount(newCount);
    setIsPending(true);

    const result = await toggleLike(entityType, entityId);

    if (result.error) {
      // Revert on error
      setLiked(!newLiked);
      setCount(!newLiked ? count + 1 : count - 1);
    } else {
      setLiked(result.liked);
      setCount(result.count);
      // Invalidate likes caches for this entity and batch caches for grids
      queryClient.invalidateQueries({ queryKey: [entityType === 'photo' ? 'photo-likes' : 'album-likes', entityId] });
      queryClient.invalidateQueries({ queryKey: [entityType === 'photo' ? 'batch-photo-like-counts' : 'batch-album-like-counts'] });
    }

    setIsPending(false);
  };

  const fetchedLikes = likesQuery.data?.likes || [];

  // Optimistically add user's avatar when they like (before refetch completes)
  const userAlreadyInLikes = fetchedLikes.some(like => like.user_id === user?.id);
  const shouldShowOptimisticUserAvatar = liked && user && profile && !userAlreadyInLikes;

  const likes = shouldShowOptimisticUserAvatar
    ? [
      {
        user_id: user.id,
        profile: {
          avatar_url: profile.avatar_url,
          full_name: profile.full_name,
          nickname: profile.nickname,
        },
      },
      ...fetchedLikes,
    ]
    : fetchedLikes;

  const visibleLikes = likes.slice(0, MAX_VISIBLE_AVATARS);
  const hasLikes = count > 0;

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      {/* Like Button */}
      <button
        onClick={handleLikeClick}
        disabled={isPending}
        className={clsx(
          'group relative z-10',
          'inline-flex items-center justify-center',
          'size-9 rounded-full',
          'text-sm font-medium text-foreground',
          'transition-colors overflow-visible',
          'border border-border-color-strong',
          'hover:border-primary focus-visible:border-primary focus-visible:outline-none',
          'bg-background-light hover:bg-background-medium focus-visible:bg-background-medium',
        )}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        {/* Wrapper for bubble + sparkle pseudo-elements */}
        <div className={`${styles.likeWrapper} ${isAnimating ? styles.animating : ''}`}>
          {liked ? (
            <HeartFilledIcon className={`size-4 text-red-500 ${isAnimating ? styles.animateHeartPop : ''}`} />
          ) : (
            <HeartIcon className="size-4 text-foreground transition-colors group-hover:text-red-500" />
          )}
        </div>
      </button>

      {/* Stacked Avatars with Likers Popover */}
      <Popover
        open={showLikers}
        onOpenChange={setShowLikers}
        align="left"
        disabled={!hasLikes}
        trigger={
          <button
            type="button"
            disabled={!hasLikes}
            tabIndex={hasLikes ? 0 : -1}
            className={clsx(
              'flex items-center',
              'py-1 px-1 -ml-1',
              'rounded-full',
              'transition-opacity duration-300 ease-out',
              'hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              hasLikes ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
            aria-label={`${count} ${count === 1 ? 'like' : 'likes'}`}
          >
            {/* Stacked avatars */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center">
                {/* Show skeletons when loading or when we have a count but no avatars yet */}
                {(likesQuery.isLoading || visibleLikes.length === 0) ? (
                  // Loading skeleton avatars
                  [...Array(Math.min(3, count))].map((_, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'size-6 rounded-full bg-border-color',
                        'ring-2 ring-background',
                        i > 0 && '-ml-2',
                        likesQuery.isLoading && 'animate-pulse',
                      )}
                    />
                  ))
                ) : (
                  // Actual avatar faces
                  visibleLikes.map((like, index) => (
                    <div
                      key={like.user_id}
                      className={clsx(
                        'relative rounded-full ring-2 ring-background bg-border-color',
                        index > 0 && '-ml-2',
                      )}
                      style={{ zIndex: MAX_VISIBLE_AVATARS - index }}
                    >
                      <Avatar
                        avatarUrl={like.profile?.avatar_url}
                        fullName={like.profile?.full_name}
                        size="xxs"
                      />
                    </div>
                  ))
                )}
              </div>
              {/* Total count */}
              <span className="text-xs font-medium text-foreground/70">
                {count > 0 ? count : ''}
              </span>
            </div>
          </button>
        }
      >
        <div className="p-2.5 max-h-96 overflow-y-auto">
          <h4 className="text-xs font-semibold mb-2 text-foreground">
            {count} {count === 1 ? 'person likes' : 'people like'} this
          </h4>

          {likesQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-1.5"
                >
                  <div className="size-8 rounded-full bg-border-color animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-24 bg-border-color animate-pulse rounded" />
                    <div className="h-2 w-16 bg-border-color animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : likes.length === 0 ? (
            <p className="text-xs text-foreground/60">No likes yet</p>
          ) : (
            <div className="space-y-1">
              {likes.map((like) => (
                <Link
                  key={like.user_id}
                  href={`/@${like.profile?.nickname || ''}`}
                  className="group flex items-center gap-2 p-1.5 rounded hover:bg-background transition-colors"
                  onClick={() => setShowLikers(false)}
                >
                  <Avatar
                    avatarUrl={like.profile?.avatar_url}
                    fullName={like.profile?.full_name}
                    size="xs"
                    hoverEffect
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {like.profile?.full_name || 'Anonymous'}
                    </p>
                    {like.profile?.nickname && (
                      <p className="text-xs text-foreground/60 truncate">
                        @{like.profile.nickname}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Popover>
    </div>
  );
}
