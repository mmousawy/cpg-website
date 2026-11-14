import AlbumGrid from '@/components/album/AlbumGrid';

import PageContainer from '@/components/layout/PageContainer';
import StickySectionHeading from '@/components/layout/StickySectionHeading';
import WidePageContainer from '@/components/layout/WidePageContainer';
import DensityAwarePhotoGrid from '@/components/photo/DensityAwarePhotoGrid';
import { ProfileBelowHeroSection, ProfileHeroBanner, profileHeroPageClassName } from '@/components/profile/ProfileHeader';
import { ProfileSocialSection } from '@/components/profile/ProfileSocialLinks';
import ArrowLink from '@/components/shared/ArrowLink';
import ProfileGearSummary from '@/components/profile/ProfileGearSummary';
import InterestCloud from '@/components/shared/InterestCloud';
import ProfileViewTracker from '@/components/shared/ProfileViewTracker';
import ProfileStatsBadges from '@/components/shared/ProfileStatsBadgesWrapper';
import { getPublishedProfileFields } from '@/lib/profileUrl/linkPublishState';
import { buildProfilePageJsonLd } from '@/lib/profile/jsonLd';

// Cached data functions
import JsonLd from '@/components/shared/JsonLd';
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getUserPublicAlbums } from '@/lib/data/albums';
import { getUserGearByNickname } from '@/lib/data/gear';
import { getProfileFollowCounts } from '@/lib/data/follows';
import { EMPTY_GEAR_PROFILE } from '@/lib/gear/types';
import type { StreamPhoto } from '@/lib/data/gallery';
import type { ProfileData } from '@/lib/data/profiles';
import {
  getAllProfileNicknames,
  getProfileByNickname,
  getProfileStats,
  getUserPublicPhotoCount,
  getUserPublicPhotos,
  getPhotosTaggedWithMember,
} from '@/lib/data/profiles';
import { ensureStaticParams } from '@/lib/staticParams';
import {
  PROFILE_PHOTOSTREAM_FETCH_LIMIT,
  PROFILE_PHOTOSTREAM_LIMIT_COMFORTABLE,
  PROFILE_PHOTOSTREAM_LIMIT_COMPACT,
} from '@/utils/displayPreferences';
import { createMetadata, formatProfileDisplayName } from '@/utils/metadata';
import { notFound } from 'next/navigation';

// Pre-render all public profiles at build time for optimal caching
export async function generateStaticParams() {
  const nicknames = await getAllProfileNicknames();
  const params = nicknames.map((nickname) => ({ nickname }));
  return ensureStaticParams(params, { nickname: '@sample' });
}

export async function generateMetadata({ params }: { params: Promise<{ nickname: string }> }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');

  // Only @-prefixed paths are profile routes
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

  // Use cached function for metadata (same cache as page)
  const includeTestContent = await getIncludeTestContent();
  const profile = await getProfileByNickname(nickname, includeTestContent);

  if (!profile) {
    return createMetadata({
      title: 'Page not found',
      description: 'The page you are looking for could not be found',
    });
  }

  const profileTitle = formatProfileDisplayName(profile.full_name, profile.nickname);
  const published = getPublishedProfileFields(profile);
  const profileDescription = published.bio || `View the profile and photo albums of @${profile.nickname}`;

  return createMetadata({
    title: `${profileTitle}'s profile`,
    description: profileDescription,
    omitImages: true,
    canonical: `/@${encodeURIComponent(nickname)}`,
    type: 'profile',
    keywords: ['photography', 'photographer', profile.nickname || '', profile.full_name || ''],
  });
}

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

export default async function PublicProfilePage({ params }: { params: Promise<{ nickname: string }> }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');

  if (!rawNickname.startsWith('@')) {
    notFound();
  }

  const nickname = rawNickname.slice(1);

  if (!nickname) {
    notFound();
  }

  return <ProfileContent
    nickname={nickname}
  />;
}

async function ProfileContent({ nickname }: { nickname: string }) {
  const includeTestContent = await getIncludeTestContent();
  const loadedProfile = await getProfileByNickname(nickname, includeTestContent);

  if (!loadedProfile) {
    notFound();
  }

  const profile: ProfileData = loadedProfile;

  const [albums, publicPhotos, totalPhotos, followCounts, gearProfile, taggedPhotos] = await Promise.all([
    getUserPublicAlbums(profile.id, nickname),
    getUserPublicPhotos(profile.id, nickname, PROFILE_PHOTOSTREAM_FETCH_LIMIT),
    getUserPublicPhotoCount(profile.id, nickname),
    getProfileFollowCounts(profile.id),
    getUserGearByNickname(nickname, includeTestContent),
    getPhotosTaggedWithMember(profile.id, nickname),
  ]);

  // Fetch stats using cached data function
  const publicStats = await getProfileStats(
    profile.id,
    nickname,
    albums.length,
    totalPhotos,
    profile.created_at || null,
  );

  const published = getPublishedProfileFields(profile);
  const profileNickname = profile.nickname || nickname;
  const profilePhotosHref = `/@${encodeURIComponent(profileNickname)}/photos`;
  const profileAlbumsHref = `/@${encodeURIComponent(profileNickname)}/albums`;
  const profileJsonLd = buildProfilePageJsonLd({
    nickname,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    createdAt: profile.created_at,
    website: profile.website,
    socialLinks: profile.social_links,
    bio: profile.bio,
    linkPublishState: profile.link_publish_state,
    interests: profile.interests,
    followerCount: followCounts.followerCount,
    followingCount: followCounts.followingCount,
    publicPhotoCount: totalPhotos,
    likesGiven: publicStats.likesGiven,
  });

  return (
    <>
      <ProfileViewTracker
        profileId={profile.id}
      />
      <JsonLd
        data={profileJsonLd}
      />
      <ProfileHeroBanner
        profile={profile}
        followerCount={followCounts.followerCount}
        followingCount={followCounts.followingCount}
      />

      <PageContainer
        className={profileHeroPageClassName}
      >
        <ProfileBelowHeroSection>
          <ProfileSocialSection
            profile={profile}
          />

          {published.bio && (
            <div
              className="sm:text-lg text-base mb-4 whitespace-pre-line max-w-[50ch]"
            >
              {published.bio}
            </div>
          )}

          <ProfileGearSummary
            profileNickname={profile.nickname || nickname}
            profile={gearProfile ?? { ...EMPTY_GEAR_PROFILE }}
          />

          {profile.interests && profile.interests.length > 0 && (
            <div
              className="mb-4"
            >
              <InterestCloud
                interests={profile.interests}
                size="sm"
              />
            </div>
          )}
        </ProfileBelowHeroSection>

        {/* Stats Badges */}
        <ProfileStatsBadges
          stats={publicStats}
        />
      </PageContainer>

      {/* Photostream - Wide container */}
      {publicPhotos.length > 0 && (
        <WidePageContainer
          className="pt-0!"
        >
          <StickySectionHeading
            as="div"
            pinDesktop
            stickyClassName="mb-6 sm:mb-6"
            accessory={
              totalPhotos > PROFILE_PHOTOSTREAM_LIMIT_COMFORTABLE ? (
                <ArrowLink
                  href={profilePhotosHref}
                >
                  View all
                  {' '}
                  {totalPhotos}
                  {' '}
                  photos
                </ArrowLink>
              ) : undefined
            }
          >
            <h2
              className="text-xl font-semibold font-heading"
            >
              Photostream
            </h2>
            <p
              className="text-sm text-foreground/80 leading-snug"
            >
              Latest photos by @
              {profileNickname}
            </p>
          </StickySectionHeading>
          <DensityAwarePhotoGrid
            photos={publicPhotos.map((photo) => ({
              ...photo,
              profile: {
                nickname: profileNickname,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
              },
            })) as StreamPhoto[]}
            sectionLimits={{
              comfortable: PROFILE_PHOTOSTREAM_LIMIT_COMFORTABLE,
              compact: PROFILE_PHOTOSTREAM_LIMIT_COMPACT,
            }}
            profileNickname={profileNickname}
            showAttribution
          />
        </WidePageContainer>
      )}

      {taggedPhotos.length > 0 && (
        <WidePageContainer
          className="pt-0!"
        >
          <StickySectionHeading
            as="div"
            pinDesktop
            stickyClassName="mb-6 sm:mb-6"
          >
            <h2
              className="text-xl font-semibold font-heading"
            >
              Tagged
            </h2>
            <p
              className="text-sm text-foreground/80 leading-snug"
            >
              Photos this member is tagged in
            </p>
          </StickySectionHeading>
          <DensityAwarePhotoGrid
            photos={taggedPhotos.map((photo) => ({
              ...photo,
              profile: photo.profile,
            })) as StreamPhoto[]}
            profileNickname={profileNickname}
            showAttribution
          />
        </WidePageContainer>
      )}

      {/* Albums - Wide container */}
      {albums.length > 0 && (
        <WidePageContainer
          className={publicPhotos.length > 0 ? 'pt-0!' : ''}
        >
          <StickySectionHeading
            as="div"
            pinDesktop
            stickyClassName="mb-6 sm:mb-6"
            accessory={(
              <ArrowLink
                href={profileAlbumsHref}
              >
                View all
                {' '}
                {albums.length}
                {' '}
                {albums.length === 1 ? 'album' : 'albums'}
              </ArrowLink>
            )}
          >
            <h2
              className="text-xl font-semibold font-heading"
            >
              Albums
            </h2>
            <p
              className="text-sm text-foreground/80 leading-snug"
            >
              Photo collections by @
              {profileNickname}
            </p>
          </StickySectionHeading>
          <AlbumGrid
            albums={albums}
          />
        </WidePageContainer>
      )}
    </>
  );
}
