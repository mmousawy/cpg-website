'use client';

import FollowListModal from '@/components/profile/FollowListModal';
import type { FollowListType } from '@/types/follows';
import clsx from 'clsx';
import { useState } from 'react';

type ProfileFollowStatsProps = {
  profileId: string;
  followerCount: number;
  followingCount: number;
  className?: string;
};

function formatCount(count: number): string {
  return count.toLocaleString();
}

export default function ProfileFollowStats({
  profileId,
  followerCount,
  followingCount,
  className,
}: ProfileFollowStatsProps) {
  const [openType, setOpenType] = useState<FollowListType | null>(null);

  if (followerCount === 0 && followingCount === 0) {
    return null;
  }

  return (
    <>
      <div
        className={clsx('mt-1 sm:mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm', className)}
      >
        {followerCount > 0 && (
          <button
            type="button"
            onClick={() => setOpenType('followers')}
            className="opacity-65 transition-opacity hover:opacity-100 hover:underline"
          >
            <span>
              {formatCount(followerCount)}
            </span>
            {' '}
            {followerCount === 1 ? 'follower' : 'followers'}
          </button>
        )}
        {followingCount > 0 && (
          <button
            type="button"
            onClick={() => setOpenType('following')}
            className="opacity-65 transition-opacity hover:opacity-100 hover:underline"
          >
            <span>
              {formatCount(followingCount)}
            </span>
            {' '}
            following
          </button>
        )}
      </div>

      <FollowListModal
        isOpen={openType !== null}
        onClose={() => setOpenType(null)}
        profileId={profileId}
        type={openType ?? 'followers'}
      />
    </>
  );
}
