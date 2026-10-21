import PageContainer from '@/components/layout/PageContainer';
import GearPageClient from '@/components/gear/GearPageClient';
import {
  ProfileBackToProfileLink,
  ProfileHeroBanner,
} from '@/components/profile/ProfileHeader';
import ProfileGearSummary from '@/components/profile/ProfileGearSummary';
import ProfileViewTracker from '@/components/shared/ProfileViewTracker';
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getUserGearByNickname } from '@/lib/data/gear';
import { getProfileFollowCounts } from '@/lib/data/follows';
import { getProfileByNickname } from '@/lib/data/profiles';
import { EMPTY_GEAR_PROFILE } from '@/lib/gear/types';
import { createMetadata, formatProfileDisplayName } from '@/utils/metadata';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ nickname: string }> }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');

  if (!rawNickname.startsWith('@')) {
    return createMetadata({
      title: 'Page not found',
      description: 'The page you are looking for could not be found',
    });
  }

  const nickname = rawNickname.slice(1);
  if (!nickname) {
    return createMetadata({
      title: 'Page not found',
      description: 'The page you are looking for could not be found',
    });
  }

  const includeTestContent = await getIncludeTestContent();
  const profile = await getProfileByNickname(nickname, includeTestContent);
  if (!profile) {
    return createMetadata({
      title: 'Page not found',
      description: 'The page you are looking for could not be found',
    });
  }

  const profileTitle = formatProfileDisplayName(profile.full_name, profile.nickname);

  return createMetadata({
    title: `${profileTitle}'s gear list`,
    description: `Cameras and gear used by ${profileTitle}`,
    canonical: `/@${encodeURIComponent(nickname)}/gear`,
  });
}

export const instant = false;

export default async function UserGearPage({ params }: { params: Promise<{ nickname: string }> }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');

  if (!rawNickname.startsWith('@')) {
    notFound();
  }

  const nickname = rawNickname.slice(1);
  if (!nickname) {
    notFound();
  }

  const includeTestContent = await getIncludeTestContent();
  const profile = await getProfileByNickname(nickname, includeTestContent);
  if (!profile) {
    notFound();
  }

  const [followCounts, gearProfile] = await Promise.all([
    getProfileFollowCounts(profile.id),
    getUserGearByNickname(nickname, includeTestContent),
  ]);
  const profileNickname = profile.nickname || nickname;
  const profileTitle = formatProfileDisplayName(profile.full_name, profile.nickname);

  return (
    <>
      <ProfileViewTracker
        profileId={profile.id}
      />
      <ProfileHeroBanner
        profile={profile}
        followerCount={followCounts.followerCount}
        followingCount={followCounts.followingCount}
        variant="subpage"
        profileTitleAsSpan
      />

      <ProfileBackToProfileLink
        profileNickname={profileNickname}
      />

      <PageContainer
        className="pt-0!"
      >
        <h1
          className="mb-6 text-xl font-semibold font-heading"
        >
          {profileTitle}
          &apos;s gear list
        </h1>
        <ProfileGearSummary
          profileNickname={profileNickname}
          profile={gearProfile ?? { ...EMPTY_GEAR_PROFILE }}
          showGearListLink={false}
          separatorBeforeList
        />
        <GearPageClient
          profileNickname={profileNickname}
          initialProfile={gearProfile ?? { ...EMPTY_GEAR_PROFILE }}
        />
      </PageContainer>
    </>
  );
}
