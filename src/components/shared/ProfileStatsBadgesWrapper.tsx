'use client';

import dynamic from 'next/dynamic';

function ProfileStatsBadgesPlaceholder() {
  return (
    <div
      className="min-h-24 animate-pulse rounded-xl border border-border-color bg-background-light"
      aria-hidden="true"
    />
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
