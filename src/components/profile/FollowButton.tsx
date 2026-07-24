'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useAuth } from '@/context/AuthContext';
import { useFollowLoginHref, useFollowMutation, useFollowStatus } from '@/hooks/useFollow';
import { confirmUnfollow } from '@/utils/confirmHelpers';
import clsx from 'clsx';
import HeartBrokenIcon from 'public/icons/heart-broken.svg';
import HeartFilledIcon from 'public/icons/heart-filled.svg';
import HeartIcon from 'public/icons/heart.svg';
import Link from 'next/link';

type FollowButtonProps = {
  profileId: string;
  profileNickname: string;
  showLabel?: boolean;
};

const sharedClassName =
  'group inline-flex shrink-0 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-60';

const neutralClassName = clsx(
  sharedClassName,
  'border-border-color bg-background-light hover:border-primary hover:text-primary',
);

const activeFollowClassName = clsx(
  sharedClassName,
  'border-primary bg-background-light text-primary hover:border-primary hover:bg-primary/5 hover:text-primary',
);

const iconOnlySizeClassName = 'size-[30px]';
const labeledSizeClassName = 'gap-1.5 px-2 py-1 text-sm font-medium';

const iconClassName = 'size-3.5 sm:size-4';

function FollowIcon({ filled, className }: { filled: boolean; className?: string }) {
  const Icon = filled ? HeartFilledIcon : HeartIcon;
  return (
    <Icon
      className={clsx(iconClassName, className)}
      aria-hidden
    />
  );
}

function FollowingStateContent() {
  return (
    <>
      <FollowIcon
        filled
        className="group-hover:hidden"
      />
      <HeartBrokenIcon
        className={clsx(iconClassName, 'hidden scale-[1.18] group-hover:block')}
        aria-hidden
      />
    </>
  );
}

export default function FollowButton({ profileId, profileNickname, showLabel = false }: FollowButtonProps) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const loginHref = useFollowLoginHref();
  const { data, isLoading } = useFollowStatus(profileId);
  const followMutation = useFollowMutation(profileId);

  if (user?.id === profileId) {
    return null;
  }

  const isFollowing = data?.isFollowing ?? false;
  const isPending = followMutation.isPending || isLoading;
  const label = isFollowing ? `Unfollow @${profileNickname}` : `Follow @${profileNickname}`;
  const buttonClassName = clsx(
    isFollowing || !showLabel ? iconOnlySizeClassName : labeledSizeClassName,
    isFollowing ? neutralClassName : activeFollowClassName,
  );

  const handleClick = async () => {
    if (isFollowing) {
      const confirmed = await confirm(confirmUnfollow(profileNickname));
      if (!confirmed) {
        return;
      }
      followMutation.mutate(false);
      return;
    }

    followMutation.mutate(true);
  };

  if (!user) {
    const loggedOutClassName = clsx(
      showLabel ? labeledSizeClassName : iconOnlySizeClassName,
      activeFollowClassName,
    );

    if (showLabel) {
      return (
        <Link
          href={loginHref}
          className={loggedOutClassName}
          aria-label={`Follow @${profileNickname}`}
        >
          <FollowIcon
            filled={false}
          />
          Follow
        </Link>
      );
    }

    return (
      <Link
        href={loginHref}
        className={loggedOutClassName}
        aria-label={`Follow @${profileNickname}`}
      >
        <FollowIcon
          filled={false}
        />
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={buttonClassName}
      aria-label={label}
      aria-pressed={isFollowing}
      disabled={isPending}
      onClick={() => void handleClick()}
    >
      {isFollowing ? (
        <FollowingStateContent />
      ) : (
        <>
          <FollowIcon
            filled={false}
          />
          {showLabel && <span>Follow</span>}
        </>
      )}
    </button>
  );
}
