'use client';

import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useAlbumLikes, usePhotoLikes } from '@/hooks/useLikes';
import { useSession } from '@/hooks/useSession';
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

function DetailLikesSectionReadOnly({
  entityType,
  className,
  initialCount = 0,
}: DetailLikesSectionProps) {
  const showAuthPrompt = useAuthPrompt();

  const handleLikeClick = () => {
    showAuthPrompt({
      feature: entityType === 'photo' ? 'like photos' : 'like albums',
    });
  };

  return (
    <div
      className={clsx('flex items-center gap-2', className)}
    >
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
        aria-label="Like"
      >
        <div
          className={styles.likeWrapper}
        >
          <HeartIcon
            className="size-4 text-foreground transition-colors group-hover:text-red-500"
          />
        </div>
      </button>

      {initialCount > 0 && (
        <span
          className="text-xs font-medium text-foreground/80"
        >
          {initialCount}
        </span>
      )}
    </div>
  );
}

function DetailLikesSectionInteractive({
  entityType,
  className,
  entityId,
  initialCount = 0,
}: DetailLikesSectionProps) {
  const { user, profile } = useAuth();
  const showAuthPrompt = useAuthPrompt();
  const queryClient = useQueryClient();

  const queryKey = entityType === 'photo' ? ['photo-likes', entityId] : ['album-likes', entityId];
  const cachedData = queryClient.getQueryData<{ likes: unknown[]; count: number; userHasLiked: boolean }>(queryKey);

  const [liked, setLiked] = useState(cachedData?.userHasLiked ?? false);
  const [count, setCount] = useState(cachedData?.count ?? initialCount);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousLikedRef = useRef(cachedData?.userHasLiked ?? false);

  const photoLikesQuery = usePhotoLikes(
    entityType === 'photo' ? entityId : undefined,
    { enabled: entityType === 'photo' },
  );
  const albumLikesQuery = useAlbumLikes(
    entityType === 'album' ? entityId : undefined,
    { enabled: entityType === 'album' },
  );
  const likesQuery = entityType === 'photo' ? photoLikesQuery : albumLikesQuery;

  useEffect(() => {
    if (likesQuery.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLiked(likesQuery.data.userHasLiked);
      setCount(likesQuery.data.count);
    }
  }, [likesQuery.data]);

  useEffect(() => {
    if (liked && !previousLikedRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }
    previousLikedRef.current = liked;
  }, [liked]);

  const handleLikeClick = () => {
    if (!user) {
      showAuthPrompt({
        feature: entityType === 'photo' ? 'like photos' : 'like albums',
      });
      return;
    }

    const newLiked = !liked;
    const newCount = newLiked ? count + 1 : count - 1;
    setLiked(newLiked);
    setCount(newCount);
    queueLike(entityType, entityId, newLiked);
  };

  const fetchedLikes = likesQuery.data?.likes || [];
  const userAlreadyInLikes = fetchedLikes.some((like) => like.user_id === user?.id);
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

      <StackedAvatarsPopover
        people={likersPeople}
        singularLabel="like"
        pluralLabel="likes"
        emptyMessage="No likes yet"
        popoverTitle={(c) => `${c} ${c === 1 ? 'person likes' : 'people like'} this`}
        isLoading={likesQuery.isLoading}
        showInlineCount={false}
      />

      {count > 0 && (
        <span
          className="text-xs font-medium text-foreground/80"
        >
          {count}
        </span>
      )}
    </div>
  );
}

export default function DetailLikesSection(props: DetailLikesSectionProps) {
  const { isLoggedIn } = useSession();

  if (!isLoggedIn) {
    return (
      <DetailLikesSectionReadOnly
        {...props}
      />
    );
  }

  return (
    <DetailLikesSectionInteractive
      {...props}
    />
  );
}
