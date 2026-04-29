'use client';

import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import {
  useSceneEventInterest,
  useToggleSceneEventInterest,
  type SceneEventInterest,
} from '@/hooks/useSceneEvents';
import clsx from 'clsx';
import StarFilledIcon from 'public/icons/star-filled.svg';
import StarOutlineIcon from 'public/icons/star-outline.svg';
import StackedAvatarsPopover, { type AvatarPerson } from '@/components/shared/StackedAvatarsPopover';

interface SceneEventInterestSectionProps {
  sceneEventId: string;
  /** Initial count from server (interest_count) */
  initialCount?: number;
  className?: string;
}

export default function SceneEventInterestSection({
  sceneEventId,
  initialCount = 0,
  className,
}: SceneEventInterestSectionProps) {
  const { user, profile } = useAuth();
  const showAuthPrompt = useAuthPrompt();
  const interestQuery = useSceneEventInterest(sceneEventId, {
    initialCount,
  });
  const toggleMutation = useToggleSceneEventInterest(sceneEventId);

  const interested = interestQuery.data?.userIsInterested ?? false;
  const count = interestQuery.data?.count ?? initialCount;
  const interests = interestQuery.data?.interests ?? [];

  const userAlreadyInList = interests.some((i) => i.user_id === user?.id);
  const shouldShowOptimisticUser =
    interested && user && profile && !userAlreadyInList;

  const people: AvatarPerson[] = shouldShowOptimisticUser
    ? [
      {
        id: user!.id,
        avatarUrl: profile!.avatar_url,
        fullName: profile!.full_name,
        nickname: profile!.nickname,
      },
      ...interests.map((i: SceneEventInterest) => ({
        id: i.user_id,
        avatarUrl: i.profile?.avatar_url,
        fullName: i.profile?.full_name,
        nickname: i.profile?.nickname,
      })),
    ]
    : interests.map((i: SceneEventInterest) => ({
      id: i.user_id,
      avatarUrl: i.profile?.avatar_url,
      fullName: i.profile?.full_name,
      nickname: i.profile?.nickname,
    }));

  const handleClick = () => {
    if (!user) {
      showAuthPrompt({ feature: 'show interest in Scene events' });
      return;
    }
    toggleMutation.mutate();
  };

  return (
    <div
      className={clsx('flex items-center gap-2', className)}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={toggleMutation.isPending}
        className={clsx(
          'group relative z-10',
          'inline-flex items-center justify-center gap-2',
          'size-9 rounded-full px-3 sm:size-auto sm:h-9 sm:min-w-35 sm:rounded-full',
          'text-sm font-medium text-foreground',
          'transition-colors overflow-visible',
          'border border-border-color-strong',
          'hover:border-primary focus-visible:border-primary focus-visible:outline-none',
          'bg-background-light hover:bg-background-medium focus-visible:bg-background-medium',
        )}
        aria-label={interested ? 'Remove interest' : "I'm interested"}
      >
        {interested ? (
          <StarFilledIcon
            className="size-4 shrink-0 text-primary"
          />
        ) : (
          <StarOutlineIcon
            className="size-4 shrink-0 text-foreground transition-colors group-hover:text-primary"
          />
        )}
        <span
          className="max-sm:sr-only"
        >
          {interested ? 'Interested' : "I'm interested"}
        </span>
      </button>

      <StackedAvatarsPopover
        people={people}
        singularLabel="interested"
        pluralLabel="interested"
        emptyMessage="No one interested yet"
        popoverTitle={(c) =>
          `${c} ${c === 1 ? 'person is' : 'people are'} interested`
        }
        isLoading={interestQuery.isLoading}
        showInlineCount={false}
      />

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
