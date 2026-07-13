import AlbumGrid from '@/components/album/AlbumGrid';
import WidePageContainer from '@/components/layout/WidePageContainer';
import { ProfileBackToProfileLink, ProfileHeroBanner } from '@/components/profile/ProfileHeader';
import { getUserPublicAlbums } from '@/lib/data/albums';
import {
  getProfileByNickname,
} from '@/lib/data/profiles';
import { createMetadata, formatProfileDisplayName } from '@/utils/metadata';
import { cacheLife, cacheTag } from 'next/cache';
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

  const profile = await getProfileByNickname(nickname);
  if (!profile) {
    return createMetadata({
      title: 'Page not found',
      description: 'The page you are looking for could not be found',
    });
  }

  const profileTitle = formatProfileDisplayName(profile.full_name, profile.nickname);

  return createMetadata({
    title: `Albums by ${profileTitle}`,
    description: `Browse photo albums by ${profileTitle}`,
    canonical: `/@${encodeURIComponent(nickname)}/albums`,
    keywords: ['albums', 'photography', profile.nickname || '', profile.full_name || ''],
  });
}

export default async function UserAlbumsPage({ params }: { params: Promise<{ nickname: string }> }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');

  if (!rawNickname.startsWith('@')) {
    notFound();
  }

  const nickname = rawNickname.slice(1);
  if (!nickname) {
    notFound();
  }

  const profile = await getProfileByNickname(nickname);
  if (!profile) {
    notFound();
  }

  return (
    <CachedAlbumsContent
      profile={profile}
      nickname={nickname}
    />
  );
}

async function CachedAlbumsContent({
  profile,
  nickname,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getProfileByNickname>>>;
  nickname: string;
}) {
  'use cache';

  cacheLife('max');
  cacheTag(`profile-${nickname}`);

  const albums = await getUserPublicAlbums(profile.id, nickname, 100);

  const profileNickname = profile.nickname || nickname;

  return (
    <>
      <ProfileHeroBanner
        profile={profile}
      />

      <ProfileBackToProfileLink
        profileNickname={profileNickname}
      />

      <WidePageContainer
        className="pt-0!"
      >
        <div
          className="mb-6"
        >
          <h2
            className="text-xl font-semibold font-heading"
          >
            Albums by
            {' '}
            {profile.full_name || `@${profile.nickname}`}
          </h2>
          <p
            className="mt-1 text-sm text-foreground/60"
          >
            {albums.length}
            {' '}
            {albums.length === 1 ? 'album' : 'albums'}
          </p>
        </div>
        {albums.length > 0 ? (
          <AlbumGrid
            albums={albums}
          />
        ) : (
          <div
            className="rounded-lg border border-border-color bg-background-light p-12 text-center"
          >
            <p
              className="text-lg opacity-70"
            >
              No albums yet.
            </p>
          </div>
        )}
      </WidePageContainer>
    </>
  );
}
