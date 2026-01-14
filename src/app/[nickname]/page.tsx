import AlbumGrid from '@/components/album/AlbumGrid';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import ClickableAvatar from '@/components/shared/ClickableAvatar';
import ProfileStatsBadges from '@/components/shared/ProfileStatsBadges';
import { getDomain, getSocialIcon } from '@/utils/socialIcons';
import { createPublicClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';

// Cached data functions
import {
  getProfileByNickname,
  getUserPublicPhotos,
  getUserPublicPhotoCount,
  getProfileStats,
} from '@/lib/data/profiles';
import { getUserPublicAlbums } from '@/lib/data/albums';

type SocialLink = { label: string; url: string };

export async function generateMetadata({ params }: { params: Promise<{ nickname: string }> }) {
  const resolvedParams = await params;
  // Decode URL parameters and remove @ prefix from nickname if present
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;

  if (!nickname) {
    return {
      title: 'Profile Not Found',
    };
  }

  const supabase = createPublicClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, nickname, bio')
    .eq('nickname', nickname)
    .single();

  if (!profile) {
    return {
      title: 'Profile Not Found',
    };
  }

  return {
    title: `${profile.full_name || `@${profile.nickname}`}`,
    description: profile.bio || `View the profile and photo albums of @${profile.nickname}`,
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ nickname: string }> }) {
  const resolvedParams = await params;
  // Decode URL parameters and remove @ prefix from nickname if present
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;

  if (!nickname) {
    notFound();
  }

  // Fetch profile using cached data function
  const profile = await getProfileByNickname(nickname);

  if (!profile) {
    notFound();
  }

  // Fetch user's albums and photos using cached data functions
  const [albums, publicPhotos, totalPhotos] = await Promise.all([
    getUserPublicAlbums(profile.id, nickname, 50),
    getUserPublicPhotos(profile.id, nickname, 50),
    getUserPublicPhotoCount(profile.id, nickname),
  ]);

  // Fetch stats using cached data function
  const publicStats = await getProfileStats(
    profile.id,
    nickname,
    albums.length,
    totalPhotos,
    profile.created_at || null
  );

  const socialLinks = (profile.social_links || []) as SocialLink[];

  return (
    <>
      <PageContainer>
        {/* Profile Header */}
        <div className="mb-8 sm:mb-10">
          {/* Avatar and Name */}
          <div className="mb-3 sm:mb-6 flex items-center gap-3 sm:gap-4">
            <div className="relative shrink-0 rounded-full outline-2 outline-transparent outline-offset-2 focus-within:outline-primary transition-none">
              <div className="flex h-20 w-20 sm:h-26 sm:w-26 items-center justify-center overflow-hidden rounded-full border-2 border-border-color">
                <ClickableAvatar
                  avatarUrl={profile.avatar_url}
                  fullName={profile.full_name}
                  className="size-full"
                  suppressFocusOutline
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="sm:text-3xl text-xl font-bold truncate">
                {profile.full_name || `@${profile.nickname}`}
              </h1>
              {profile.full_name && (
                <p className="sm:text-lg text-base opacity-70">
                  @{profile.nickname}
                </p>
              )}

              {/* Links - Desktop only (inline with name) */}
              {(profile.website || socialLinks.length > 0) && (
                <div className="hidden sm:flex flex-wrap items-center gap-2 sm:mt-2">
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2 py-1 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                    >
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
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
          </div>

          {/* Links - Mobile only (full width below avatar) */}
          {(profile.website || socialLinks.length > 0) && (
            <div className="flex sm:hidden flex-wrap items-center gap-2 mb-4">
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
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

          {/* Bio */}
          {profile.bio && (
            <div className="sm:text-lg text-base mb-4 whitespace-pre-line max-w-[50ch]">
              {profile.bio}
            </div>
          )}
        </div>

        {/* Stats Badges */}
        <ProfileStatsBadges stats={publicStats} />
      </PageContainer>

      {/* Photostream - Wide container */}
      {publicPhotos.length > 0 && (
        <WidePageContainer className="!pt-0">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Photostream</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Latest photos by @{profile.nickname}
            </p>
          </div>
          <JustifiedPhotoGrid photos={publicPhotos} profileNickname={profile.nickname || nickname} />
        </WidePageContainer>
      )}

      {/* Albums - Wide container */}
      {albums.length > 0 && (
        <WidePageContainer className={publicPhotos.length > 0 ? '!pt-0' : ''}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Albums</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Photo collections by @{profile.nickname}
            </p>
          </div>
          <AlbumGrid albums={albums} />
        </WidePageContainer>
      )}
    </>
  );
}
