import PhotosPaginated from '@/components/gallery/PhotosPaginated';
import WidePageContainer from '@/components/layout/WidePageContainer';
import { ProfileBackToProfileLink, ProfileHeroBanner } from '@/components/profile/ProfileHeader';
import type { StreamPhoto } from '@/lib/data/gallery';
import {
  getProfileByNickname,
  getUserPublicPhotoCount,
  getUserPublicPhotos,
} from '@/lib/data/profiles';
import { createMetadata } from '@/utils/metadata';
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

  const profileTitle = profile.full_name || `@${profile.nickname}`;

  return createMetadata({
    title: `Photos by ${profileTitle}`,
    description: `Browse all photos by ${profileTitle}`,
    canonical: `/@${encodeURIComponent(nickname)}/photos`,
    keywords: ['photos', 'photography', profile.nickname || '', profile.full_name || ''],
  });
}

export default async function UserPhotosPage({ params }: { params: Promise<{ nickname: string }> }) {
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
    <CachedPhotosContent
      profile={profile}
      nickname={nickname}
    />
  );
}

async function CachedPhotosContent({
  profile,
  nickname,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getProfileByNickname>>>;
  nickname: string;
}) {
  'use cache';

  cacheLife('max');
  cacheTag(`profile-${nickname}`);

  const perPage = 20;
  const [allPhotos, totalPhotos] = await Promise.all([
    getUserPublicPhotos(profile.id, nickname, perPage + 1),
    getUserPublicPhotoCount(profile.id, nickname),
  ]);

  const initialPhotos = allPhotos.slice(0, perPage);
  const hasMore = allPhotos.length > perPage;

  const photosWithProfile: StreamPhoto[] = initialPhotos.map((photo) => ({
    ...photo,
    profile: {
      nickname: profile.nickname || nickname,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    },
  })) as StreamPhoto[];

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
        <PhotosPaginated
          initialPhotos={photosWithProfile}
          perPage={perPage}
          initialHasMore={hasMore}
          apiEndpoint={`/api/photos/user?nickname=${encodeURIComponent(profileNickname)}`}
          showSortToggle={false}
          header={
            <div
              className="mb-6"
            >
              <h2
                className="text-xl font-semibold font-heading"
              >
                All photos by
                {' '}
                {profile.full_name || `@${profile.nickname}`}
              </h2>
              <p
                className="mt-1 text-sm text-foreground/60"
              >
                {totalPhotos}
                {' '}
                {totalPhotos === 1 ? 'photo' : 'photos'}
              </p>
            </div>
          }
        />
      </WidePageContainer>
    </>
  );
}
