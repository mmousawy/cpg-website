import PhotosPaginated from '@/components/gallery/PhotosPaginated';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import ArrowLink from '@/components/shared/ArrowLink';
import ClickableAvatar from '@/components/shared/ClickableAvatar';
import ProfileActionsPopover from '@/components/shared/ProfileActionsPopover';
import type { StreamPhoto } from '@/lib/data/gallery';
import {
  getProfileByNickname,
  getUserPublicPhotoCount,
  getUserPublicPhotos,
} from '@/lib/data/profiles';
import { createMetadata } from '@/utils/metadata';
import { getDomain, getSocialIcon } from '@/utils/socialIcons';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

type SocialLink = { label: string; url: string };

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

  const socialLinks = (profile.social_links || []) as SocialLink[];
  const profileNickname = profile.nickname || nickname;

  return (
    <>
      <PageContainer>
        <ArrowLink
          href={`/@${encodeURIComponent(profileNickname)}`}
          direction="left"
          className="mb-6"
        >
          Back to profile
        </ArrowLink>

        {/* Profile Header */}
        <div
          className="mb-8 sm:mb-10"
        >
          <div
            className="mb-3 sm:mb-6 flex items-start gap-3 sm:gap-4 relative"
          >
            <div
              className="relative shrink-0 rounded-full outline-2 outline-transparent outline-offset-2 focus-within:outline-primary transition-none"
            >
              <div
                className="flex h-20 w-20 sm:h-26 sm:w-26 items-center justify-center overflow-hidden rounded-full border-2 border-border-color"
              >
                <ClickableAvatar
                  avatarUrl={profile.avatar_url}
                  fullName={profile.full_name}
                  className="size-full"
                  suppressFocusOutline
                />
              </div>
            </div>
            <div
              className="flex-1 min-w-0"
            >
              <h1
                className="sm:text-3xl text-xl font-bold line-clamp-2 pr-8"
              >
                {profile.full_name || `@${profile.nickname}`}
              </h1>
              {profile.full_name && (
                <p
                  className="sm:text-lg text-base opacity-70"
                >
                  @
                  {profile.nickname}
                </p>
              )}
              {/* Links - Desktop only */}
              {(profile.website || socialLinks.length > 0) && (
                <div
                  className="hidden sm:flex flex-wrap items-center gap-2 sm:mt-2"
                >
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2 py-1 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                    >
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                        />
                      </svg>
                      {getDomain(profile.website)}
                    </a>
                  )}
                  {socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border-color bg-background-light px-2 py-1 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                    >
                      {getSocialIcon(link.label)}
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {profile.nickname && (
              <ProfileActionsPopover
                profileId={profile.id}
                profileNickname={profile.nickname}
              />
            )}
          </div>

          {/* Links - Mobile only */}
          {(profile.website || socialLinks.length > 0) && (
            <div
              className="flex sm:hidden flex-wrap items-center gap-2 mb-4"
            >
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  <svg
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  {getDomain(profile.website)}
                </a>
              )}
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {getSocialIcon(link.label)}
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </PageContainer>

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
                className="text-xl font-semibold"
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
