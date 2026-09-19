'use client';

import Button from '@/components/shared/Button';
import StackedAvatarsPopover from '@/components/shared/StackedAvatarsPopover';
import StickyActionBar from '@/components/shared/StickyActionBar';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import {
  useSceneEventInterest,
  useToggleSceneEventInterest,
  type SceneEventInterest,
} from '@/hooks/useSceneEvents';
import { useSession } from '@/hooks/useSession';
import type { SceneEvent } from '@/types/scene';
import clsx from 'clsx';
import StarFilledIcon from 'public/icons/star-filled.svg';
import StarOutlineIcon from 'public/icons/star-outline.svg';

import ArrowRightSVG from 'public/icons/arrow-right.svg';

type SceneEventStickyBarProps = {
  event: SceneEvent;
};

function SceneEventStickyBarGuest({ event }: SceneEventStickyBarProps) {
  const showAuthPrompt = useAuthPrompt();
  const count = event.interest_count ?? 0;

  return (
    <>
      <div
        className="flex items-center gap-2 min-w-0"
      >
        <button
          type="button"
          onClick={() => showAuthPrompt({ feature: 'show interest in Scene events' })}
          className={clsx(
            'group flex items-center justify-center gap-2 shrink-0',
            'h-9 rounded-full',
            count > 0 ? 'size-9 sm:size-auto sm:h-9 sm:min-w-35 sm:px-3' : 'px-3',
            'border border-border-color-strong',
            'hover:border-primary focus-visible:border-primary focus-visible:outline-none',
            'bg-background-light hover:bg-background-medium',
          )}
          aria-label="I'm interested"
        >
          <StarOutlineIcon
            className="size-4 shrink-0 -ml-[0.2rem] text-foreground transition-colors group-hover:text-primary"
          />
          <span
            className={clsx('text-sm font-medium', count > 0 && 'hidden sm:inline')}
          >
            I&apos;m interested
          </span>
        </button>

        {count > 0 && (
          <span
            className="text-xs font-medium text-foreground/80 shrink-0"
          >
            {count}
          </span>
        )}
      </div>

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
            iconRight={(
              <ArrowRightSVG
                className="size-4 fill-current"
              />
            )}
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
    </>
  );
}

function SceneEventStickyBarAuthenticated({ event }: SceneEventStickyBarProps) {
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

  const people = shouldShowOptimisticUser
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
    <>
      <div
        className="flex items-center gap-2 min-w-0"
      >
        <button
          type="button"
          onClick={handleInterestClick}
          disabled={toggleMutation.isPending}
          className={clsx(
            'group flex items-center justify-center gap-2 shrink-0 rounded-full',
            interested && 'size-9',
            !interested && count > 0 && 'size-9 sm:size-auto sm:h-9 sm:min-w-35 sm:px-3',
            !interested && count === 0 && 'h-9 px-3',
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
              className={clsx(
                'size-4 shrink-0 text-foreground transition-colors group-hover:text-primary',
                count === 0 && '-ml-[0.2rem]',
              )}
            />
          )}
          {!interested && (
            <span
              className={clsx('text-sm font-medium', count > 0 && 'hidden sm:inline')}
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
            className="text-xs font-medium text-foreground/80 shrink-0"
          >
            {count}
          </span>
        )}
      </div>

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
            iconRight={(
              <ArrowRightSVG
                className="size-4 fill-current"
              />
            )}
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
    </>
  );
}

export default function SceneEventStickyBar(props: SceneEventStickyBarProps) {
  const { isLoggedIn } = useSession();

  return (
    <StickyActionBar constrainWidth>
      {isLoggedIn ? (
        <SceneEventStickyBarAuthenticated {...props} />
      ) : (
        <SceneEventStickyBarGuest {...props} />
      )}
    </StickyActionBar>
  );
}
