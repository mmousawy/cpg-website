'use client';

import StickySectionHeading from '@/components/layout/StickySectionHeading';
import dynamic from 'next/dynamic';

function ProfileStatsBadgesPlaceholder() {
  return (
    <div
      className="mt-8"
    >
      <StickySectionHeading
        stickyClassName="mb-3 sm:mb-4"
      >
        Achievements
      </StickySectionHeading>
      <div
        className="flex gap-2 overflow-hidden pb-4"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-[80.5px] sm:h-[119px] w-24 sm:w-30 shrink-0 animate-pulse rounded-md border border-border-color bg-background-light"
          />
        ))}
      </div>
    </div>
  );
}

const ProfileStatsBadges = dynamic(
  () => import('./ProfileStatsBadges'),
  {
    ssr: false,
    loading: () => <ProfileStatsBadgesPlaceholder />,
  },
);

export default ProfileStatsBadges;
