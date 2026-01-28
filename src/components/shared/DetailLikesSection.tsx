'use client';

import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useAlbumLikes, usePhotoLikes } from '@/hooks/useLikes';
import { queueLike } from '@/lib/sync';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import HeartFilledIcon from 'public/icons/heart-filled.svg';
import HeartIcon from 'public/icons/heart.svg';
import { useEffect, useRef, useState } from 'react';
import styles from './LikeButton.module.css';
import StackedAvatarsPopover, { type AvatarPerson } from './StackedAvatarsPopover';

interface DetailLikesSectionProps {
  entityType: 'photo' | 'album';
  entityId: string;
  className?: string;
  /** Initial likes count from server (from likes_count column) */
  initialCount?: number;
}

/**
 * Optimized likes section for detail pages.
 * - Shows count immediately from server-provided initialCount
 * - Fetches likers on mount to display stacked avatars
 * - Clicking avatars opens popover with full liker list
 */

export default function DetailLikesSection({ entityType, className, entityId, initialCount = 0 }: DetailLikesSectionProps) {
  const { user, profile } = useAuth();
  const showAuthPrompt = useAuthPrompt();
  const queryClient = useQueryClient();

  // Get cached data to initialize state (prevents flash of stale data on navigation)
  const queryKey = entityType === 'photo' ? ['photo-likes', entityId] : ['album-likes', entityId];
  const cachedData = queryClient.getQueryData<{ likes: unknown[]; count: number; userHasLiked: boolean }>(queryKey);

  // Local state for optimistic updates - initialize from cache if available, else server count
  const [liked, setLiked] = useState(cachedData?.userHasLiked ?? false);
  const [count, setCount] = useState(cachedData?.count ?? initialCount);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousLikedRef = useRef(cachedData?.userHasLiked ?? false);


  // Always fetch likes - we need to know if the current user has liked
  const photoLikesQuery = usePhotoLikes(
    entityType === 'photo' ? entityId : undefined,
    { enabled: entityType === 'photo' },
  );
  const albumLikesQuery = useAlbumLikes(
    entityType === 'album' ? entityId : undefined,
    { enabled: entityType === 'album' },
  );
  const likesQuery = entityType === 'photo' ? photoLikesQuery : albumLikesQuery;

  // Update local state when likes data is fetched
  // This syncs server data with local state for optimistic updates
  // Note: Setting state in effect is intentional here - we're syncing external query data
  useEffect(() => {
    if (likesQuery.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLiked(likesQuery.data.userHasLiked);
      setCount(likesQuery.data.count);
    }
  }, [likesQuery.data]);

  // Trigger animation when liked changes from false to true
  useEffect(() => {
    if (liked && !previousLikedRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }
    previousLikedRef.current = liked;
  }, [liked]);

  const handleLikeClick = () => {
    // Show auth prompt for non-authenticated users
    if (!user) {
      showAuthPrompt({
        feature: entityType === 'photo' ? 'like photos' : 'like albums',
      });
      return;
    }

    // Optimistic update - immediate local state change
    const newLiked = !liked;
    const newCount = newLiked ? count + 1 : count - 1;
    setLiked(newLiked);
    setCount(newCount);

    // Queue the sync to server after 1 second debounce
    // Sync persists even if user navigates away
    queueLike(entityType, entityId, newLiked);
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

  // Transform likes to AvatarPerson format for the shared component
  const likersPeople: AvatarPerson[] = likes.map((like) => ({
    id: like.user_id,
    avatarUrl: like.profile?.avatar_url,
    fullName: like.profile?.full_name,
    nickname: like.profile?.nickname,
  }));

  return (
    <div
      className={clsx('flex items-center gap-2', className)}
    >
      {/* Like Button */}
      <button
        onClick={handleLikeClick}
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
        <div
          className={`${styles.likeWrapper} ${isAnimating ? styles.animating : ''}`}
        >
          {liked ? (
            <HeartFilledIcon
              className={`size-4 text-red-500 ${isAnimating ? styles.animateHeartPop : ''}`}
            />
          ) : (
            <HeartIcon
              className="size-4 text-foreground transition-colors group-hover:text-red-500"
            />
          )}
        </div>
      </button>

      {/* Stacked Avatars with Likers Popover */}
      <StackedAvatarsPopover
        people={likersPeople}
        singularLabel="like"
        pluralLabel="likes"
        emptyMessage="No likes yet"
        popoverTitle={(c, l) => `${c} ${c === 1 ? 'person likes' : 'people like'} this`}
        isLoading={likesQuery.isLoading}
        showInlineCount={false}
      />

      {/* Count display (separate from avatars for likes) */}
      <span
        className={clsx(
          'text-xs font-medium text-foreground/70',
          'transition-opacity duration-300',
          count > 0 ? 'opacity-100' : 'opacity-0',
        )}
      >
        {count > 0 ? count : ''}
      </span>
    </div>
  );
}
