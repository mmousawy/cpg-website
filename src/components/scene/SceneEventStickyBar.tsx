'use client';

import Button from '@/components/shared/Button';
import SceneActionsPopover from '@/components/scene/SceneActionsPopover';
import StackedAvatarsPopover, {
  type AvatarPerson,
} from '@/components/shared/StackedAvatarsPopover';
import StickyActionBar from '@/components/shared/StickyActionBar';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import {
  useSceneEventInterest,
  useToggleSceneEventInterest,
  type SceneEventInterest,
} from '@/hooks/useSceneEvents';
import type { SceneEvent } from '@/types/scene';
import clsx from 'clsx';
import StarFilledIcon from 'public/icons/star-filled.svg';
import StarOutlineIcon from 'public/icons/star-outline.svg';

import ArrowRightSVG from 'public/icons/arrow-right.svg';

type SceneEventStickyBarProps = {
  event: SceneEvent;
};

export default function SceneEventStickyBar({ event }: SceneEventStickyBarProps) {
  const { user, profile } = useAuth();
  const showAuthPrompt = useAuthPrompt();
  const interestQuery = useSceneEventInterest(event.id, {
    initialCount: event.interest_count ?? 0,
  });
  const toggleMutation = useToggleSceneEventInterest(event.id);

  const interested = interestQuery.data?.userIsInterested ?? false;
  const count = interestQuery.data?.count ?? (event.interest_count ?? 0);
  const interests = interestQuery.data?.interests ?? [];

  const userAlreadyInList = interests.some((i) => i.user_id === user?.id);
  const shouldShowOptimisticUser =
    interested && user && profile && !userAlreadyInList;

  const people: AvatarPerson[] = shouldShowOptimisticUser
    ? [
      {
        id: user.id,
        avatarUrl: profile.avatar_url,
        fullName: profile.full_name,
        nickname: profile.nickname,
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

  const handleInterestClick = () => {
    if (!user) {
      showAuthPrompt({ feature: 'show interest in Scene events' });
      return;
    }
    toggleMutation.mutate();
  };

  return (
    <StickyActionBar
      constrainWidth
    >
      {/* Left: star button + interested people */}
      <div
        className="flex items-center gap-2 min-w-0"
      >
        <button
          type="button"
          onClick={handleInterestClick}
          disabled={toggleMutation.isPending}
          className={clsx(
            'group flex items-center justify-center gap-2 shrink-0',
            'size-9 rounded-full',
            !interested && 'sm:size-auto sm:h-9 sm:min-w-35 sm:px-3',
            'border border-border-color-strong',
            'hover:border-primary focus-visible:border-primary focus-visible:outline-none',
            'bg-background-light hover:bg-background-medium',
          )}
          aria-label={interested ? 'Remove interest' : "I'm interested"}
        >
          {interested ? (
            <StarFilledIcon
              className="size-4 shrink-0 text-primary"
            />
          ) : (
            <StarOutlineIcon
              className="size-4 shrink-0 sm:-ml-[0.2rem] text-foreground transition-colors group-hover:text-primary"
            />
          )}
          {!interested && (
            <span
              className="hidden sm:inline text-sm font-medium"
            >
              I&apos;m interested
            </span>
          )}
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
          popoverSide="top"
        />

        {count > 0 && (
          <span
            className="text-xs font-medium text-foreground/70 shrink-0"
          >
            {count}
          </span>
        )}
      </div>

      {/* Right: actions menu + visit website */}
      <div
        className="flex items-center gap-2 shrink-0"
      >
        {event.url && (
          <Button
            href={event.url}
            variant="primary"
            size="md"
            target="_blank"
            rel="noopener noreferrer"
            iconRight={
              <ArrowRightSVG
                className="size-4 fill-current"
              />
            }
            className="rounded-full shrink-0"
          >
            <span
              className="hidden sm:inline"
            >
              Visit website
            </span>
            <span
              className="inline sm:hidden"
            >
              Visit
            </span>
          </Button>
        )}
      </div>
    </StickyActionBar>
  );
}
