import AlbumGrid from '@/components/album/AlbumGrid';

import WidePageContainer from '@/components/layout/WidePageContainer';
import {
    ProfileBackToProfileLink,
    ProfileHeroBanner,
} from '@/components/profile/ProfileHeader';
import EmptyState from '@/components/shared/EmptyState';
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getUserPublicAlbums } from '@/lib/data/albums';
import { getProfileFollowCounts } from '@/lib/data/follows';
import {
    getProfileByNickname,
} from '@/lib/data/profiles';
import { createMetadata, formatProfileDisplayName } from '@/utils/metadata';
import { notFound } from 'next/navigation';
import FolderSVG from 'public/icons/folder.svg';

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
    title: `Albums by ${profileTitle}`,
    description: `Browse photo albums by ${profileTitle}`,
    canonical: `/@${encodeURIComponent(nickname)}/albums`,
    keywords: ['albums', 'photography', profile.nickname || '', profile.full_name || ''],
  });
}

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

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

  return (
    <CachedAlbumsContent
      nickname={nickname}
    />
  );
}

async function CachedAlbumsContent({ nickname }: { nickname: string }) {
  const includeTestContent = await getIncludeTestContent();
  const profile = await getProfileByNickname(nickname, includeTestContent);
  if (!profile) {
    notFound();
  }

  const [albums, followCounts] = await Promise.all([
    getUserPublicAlbums(profile.id, nickname),
    getProfileFollowCounts(profile.id, nickname),
  ]);

  const profileNickname = profile.nickname || nickname;

  return (
    <>
      <ProfileHeroBanner
        profile={profile}
        followerCount={followCounts.followerCount}
        followingCount={followCounts.followingCount}
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
            className="text-sm text-foreground/80 leading-snug"
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
          <EmptyState
            icon={<FolderSVG
              className="size-10 inline-block"
            />}
            title="No albums yet."
          />
        )}
      </WidePageContainer>
    </>
  );
}
