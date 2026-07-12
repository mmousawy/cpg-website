import AlbumGrid from '@/components/album/AlbumGrid';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import { ProfileBelowHeroSection, ProfileHeroBanner, profileHeroPageClassName } from '@/components/profile/ProfileHeader';
import Button from '@/components/shared/Button';
import InterestCloud from '@/components/shared/InterestCloud';
import ProfileStatsBadges from '@/components/shared/ProfileStatsBadges';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

// Cached data functions
import JsonLd from '@/components/shared/JsonLd';
import { getUserPublicAlbums } from '@/lib/data/albums';
import type { StreamPhoto } from '@/lib/data/gallery';
import {
  getAllProfileNicknames,
  getProfileByNickname,
  getProfileStats,
  getUserPublicPhotoCount,
  getUserPublicPhotos,
} from '@/lib/data/profiles';
import { createMetadata, getAbsoluteUrl, getSocialImageUrl } from '@/utils/metadata';

// Pre-render all public profiles at build time for optimal caching
export async function generateStaticParams() {
  const nicknames = await getAllProfileNicknames();
  return nicknames.map((nickname) => ({ nickname }));
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
  const profile = await getProfileByNickname(nickname);

  if (!profile) {
    return createMetadata({
      title: 'Page not found',
      description: 'The page you are looking for could not be found',
    });
  }

  const profileTitle = profile.full_name || `@${profile.nickname}`;
  const profileDescription = profile.bio || `View the profile and photo albums of @${profile.nickname}`;
  const profileImage = getSocialImageUrl(profile.avatar_url);

  return createMetadata({
    title: profileTitle,
    description: profileDescription,
    image: profileImage,
    canonical: `/@${encodeURIComponent(nickname)}`,
    type: 'profile',
    keywords: ['photography', 'photographer', profile.nickname || '', profile.full_name || ''],
  });
}

export default async function PublicProfilePage({ params }: { params: Promise<{ nickname: string }> }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');

  // Only @-prefixed paths are profile routes
  if (!rawNickname.startsWith('@')) {
    notFound();
  }

  const nickname = rawNickname.slice(1);

  if (!nickname) {
    notFound();
  }

  // Fetch profile first (outside cache) to handle 404 properly
  const profile = await getProfileByNickname(nickname);

  if (!profile) {
    notFound();
  }

  // Now render the cached content
  return <ProfileContent
    profile={profile}
    nickname={nickname}
  />;
}

// Separate cached component for the profile content
async function ProfileContent({ profile, nickname }: { profile: NonNullable<Awaited<ReturnType<typeof getProfileByNickname>>>; nickname: string }) {
  'use cache';

  // Apply cache settings
  cacheLife('max');
  cacheTag(`profile-${nickname}`);

  // Fetch user's albums and photos using cached data functions
  const [albums, publicPhotos, totalPhotos] = await Promise.all([
    getUserPublicAlbums(profile.id, nickname, 50),
    getUserPublicPhotos(profile.id, nickname, 20),
    getUserPublicPhotoCount(profile.id, nickname),
  ]);

  // Fetch stats using cached data function
  const publicStats = await getProfileStats(
    profile.id,
    nickname,
    albums.length,
    totalPhotos,
    profile.created_at || null,
  );

  const profileUrl = getAbsoluteUrl(`/@${encodeURIComponent(nickname)}`);
  const profileJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: profile.full_name || `@${profile.nickname}`,
      url: profileUrl,
      ...(profile.bio && { description: profile.bio }),
      ...(profile.avatar_url && { image: profile.avatar_url }),
      ...((profile.social_links?.length ?? 0) > 0 && { sameAs: (profile.social_links || []).map((l) => l.url) }),
    },
  };

  return (
    <>
      <JsonLd
        data={profileJsonLd}
      />
      <ProfileHeroBanner
        profile={profile}
      />

      <PageContainer
        className={profileHeroPageClassName}
      >
        <ProfileBelowHeroSection>
          {profile.bio && (
            <div
              className="sm:text-lg text-base mb-4 whitespace-pre-line max-w-[50ch]"
            >
              {profile.bio}
            </div>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <div
              className="mb-4"
            >
              <InterestCloud
                interests={profile.interests}
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
          <JustifiedPhotoGrid
            photos={publicPhotos.map((photo) => ({
              ...photo,
              profile: {
                nickname: profile.nickname || nickname,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
              },
            })) as StreamPhoto[]}
            profileNickname={profile.nickname || nickname}
            showAttribution
            header={
              <div
                className="mb-6 flex items-start justify-between gap-4"
              >
                <div>
                  <h2
                    className="text-xl font-semibold font-heading"
                  >
                    Photostream
                  </h2>
                  <p
                    className="mt-1 text-sm text-foreground/60"
                  >
                    Latest photos by @
                    {profile.nickname}
                  </p>
                </div>
              </div>
            }
          />
          {totalPhotos > publicPhotos.length && (
            <div
              className="mt-6 flex justify-center"
            >
              <Button
                href={`/@${encodeURIComponent(profile.nickname || nickname)}/photos`}
                variant="secondary"
              >
                View all
                {' '}
                {totalPhotos}
                {' '}
                photos
              </Button>
            </div>
          )}
        </WidePageContainer>
      )}

      {/* Albums - Wide container */}
      {albums.length > 0 && (
        <WidePageContainer
          className={publicPhotos.length > 0 ? 'pt-0!' : ''}
        >
          <div
            className="mb-6 flex items-start justify-between gap-4"
          >
            <div>
              <h2
                className="text-xl font-semibold font-heading"
              >
                Albums
              </h2>
              <p
                className="mt-1 text-sm text-foreground/60"
              >
                Photo collections by @
                {profile.nickname}
              </p>
            </div>
          </div>
          <AlbumGrid
            albums={albums}
          />
          <div
            className="mt-6 flex justify-center"
          >
            <Button
              href={`/@${encodeURIComponent(profile.nickname || nickname)}/albums`}
              variant="secondary"
            >
              View all
              {' '}
              {albums.length}
              {' '}
              {albums.length === 1 ? 'album' : 'albums'}
            </Button>
          </div>
        </WidePageContainer>
      )}
    </>
  );
}
