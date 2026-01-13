import AlbumGrid from '@/components/album/AlbumGrid';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import ClickableAvatar from '@/components/shared/ClickableAvatar';
import ProfileStatsBadges from '@/components/shared/ProfileStatsBadges';
import type { Tables } from '@/database.types';
import type { AlbumWithPhotos } from '@/types/albums';
import type { Photo } from '@/types/photos';
import { getDomain, getSocialIcon } from '@/utils/socialIcons';
import { createPublicClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';

// Cache indefinitely - revalidated on-demand when data changes

type SocialLink = { label: string; url: string }

type ProfileData = Pick<Tables<'profiles'>,
  | 'id'
  | 'full_name'
  | 'nickname'
  | 'avatar_url'
  | 'bio'
  | 'website'
  | 'created_at'
> & {
  social_links: SocialLink[] | null
}

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

  const supabase = createPublicClient();

  // Fetch profile first (needed for albums query)
  // Exclude suspended users
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, nickname, avatar_url, bio, website, social_links, created_at')
    .eq('nickname', nickname)
    .is('suspended_at', null)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  const typedProfile = profile as unknown as ProfileData;

  // Fetch user's public albums (profile.id is now available)
  const { data: albums } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      created_at,
      profile:profiles(full_name, nickname, avatar_url),
      photos:album_photos_active!inner(
        id,
        photo_url
      )
    `)
    .eq('user_id', typedProfile.id)
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  // Filter out albums with no photos
  // album_photos_active view already excludes deleted photos
  const albumsWithPhotos = ((albums || []) as any[])
    .filter((album) => album.photos && album.photos.length > 0) as unknown as AlbumWithPhotos[];

  // Fetch user's public photos (ordered by user's custom sort order)
  // Exclude event cover images (storage_path starts with 'events/')
  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('user_id', typedProfile.id)
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50);

  const publicPhotos = (photos || []) as Photo[];

  // Get total photo count using separate count queries
  // Count all unique public photos (excluding event photos) - this represents all visible photos
  const { count: totalPhotosCount } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', typedProfile.id)
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('storage_path', 'like', 'events/%');

  const totalPhotos = totalPhotosCount ?? 0;

  // Fetch public stats (only positive achievements)
  let publicStats = {
    photos: totalPhotos,
    albums: albumsWithPhotos.length,
    eventsAttended: 0,
    commentsMade: 0,
    commentsReceived: 0,
    memberSince: typedProfile.created_at || null,
  };

  // Get events attended count (only confirmed RSVPs with attended_at for existing events)
  try {
    const { data: rsvpsData } = await supabase
      .from('events_rsvps')
      .select('attended_at, confirmed_at, canceled_at, event_id, events!inner(id)')
      .eq('user_id', typedProfile.id)
      .not('attended_at', 'is', null)
      .not('confirmed_at', 'is', null)
      .is('canceled_at', null);

    if (rsvpsData) {
      publicStats.eventsAttended = rsvpsData.length;
    }
  } catch {
    // RSVPs table might not exist or have issues - that's okay
  }

  // Get comments made count (public comments only)
  try {
    const { count: commentsMadeCount } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', typedProfile.id)
      .is('deleted_at', null);

    if (commentsMadeCount !== null) {
      publicStats.commentsMade = commentsMadeCount;
    }
  } catch {
    // Comments table might not exist or have issues - that's okay
  }

  // Get comments received count (comments on user's public albums and photos)
  try {
    // Get user's album IDs
    const { data: userAlbums } = await supabase
      .from('albums')
      .select('id')
      .eq('user_id', typedProfile.id)
      .eq('is_public', true)
      .is('deleted_at', null);

    // Get user's photo IDs
    const { data: userPhotos } = await supabase
      .from('photos')
      .select('id')
      .eq('user_id', typedProfile.id)
      .eq('is_public', true)
      .is('deleted_at', null);

    let commentsReceivedCount = 0;

    // Count comments on albums
    if (userAlbums && userAlbums.length > 0) {
      const albumIds = userAlbums.map(a => a.id);
      const { data: albumCommentIds } = await supabase
        .from('album_comments')
        .select('comment_id')
        .in('album_id', albumIds);

      if (albumCommentIds && albumCommentIds.length > 0) {
        const commentIds = albumCommentIds.map(ac => ac.comment_id);
        const { count: albumCommentsCount } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .in('id', commentIds)
          .is('deleted_at', null)
          .neq('user_id', typedProfile.id); // Exclude own comments

        if (albumCommentsCount !== null) {
          commentsReceivedCount += albumCommentsCount;
        }
      }
    }

    // Count comments on photos
    if (userPhotos && userPhotos.length > 0) {
      const photoIds = userPhotos.map(p => p.id);
      const { data: photoCommentIds } = await supabase
        .from('photo_comments')
        .select('comment_id')
        .in('photo_id', photoIds);

      if (photoCommentIds && photoCommentIds.length > 0) {
        const commentIds = photoCommentIds.map(pc => pc.comment_id);
        const { count: photoCommentsCount } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .in('id', commentIds)
          .is('deleted_at', null)
          .neq('user_id', typedProfile.id); // Exclude own comments

        if (photoCommentsCount !== null) {
          commentsReceivedCount += photoCommentsCount;
        }
      }
    }

    publicStats.commentsReceived = commentsReceivedCount;
  } catch {
    // Comments tables might not exist or have issues - that's okay
  }

  const socialLinks = (typedProfile.social_links || []) as SocialLink[];

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
                  avatarUrl={typedProfile.avatar_url}
                  fullName={typedProfile.full_name}
                  className="size-full"
                  suppressFocusOutline
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="sm:text-3xl text-xl font-bold truncate">
                {typedProfile.full_name || `@${typedProfile.nickname}`}
              </h1>
              {typedProfile.full_name && (
                <p className="sm:text-lg text-base opacity-70">
                  @{typedProfile.nickname}
                </p>
              )}

              {/* Links - Desktop only (inline with name) */}
              {(typedProfile.website || socialLinks.length > 0) && (
                <div className="hidden sm:flex flex-wrap items-center gap-2 sm:mt-2">
                  {typedProfile.website && (
                    <a
                      href={typedProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2 py-1 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                    >
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      {getDomain(typedProfile.website)}
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
          {(typedProfile.website || socialLinks.length > 0) && (
            <div className="flex sm:hidden flex-wrap items-center gap-2 mb-4">
              {typedProfile.website && (
                <a
                  href={typedProfile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-background-light px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  {getDomain(typedProfile.website)}
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
          {typedProfile.bio && (
            <div className="sm:text-lg text-base mb-4 whitespace-pre-line max-w-[50ch]">
              {typedProfile.bio}
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
              Latest photos by @{typedProfile.nickname}
            </p>
          </div>
          <JustifiedPhotoGrid photos={publicPhotos} profileNickname={typedProfile.nickname || nickname} />
        </WidePageContainer>
      )}

      {/* Albums - Wide container */}
      {albumsWithPhotos.length > 0 && (
        <WidePageContainer className={publicPhotos.length > 0 ? '!pt-0' : ''}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Albums</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Photo collections by @{typedProfile.nickname}
            </p>
          </div>
          <AlbumGrid albums={albumsWithPhotos} />
        </WidePageContainer>
      )}

      {/* Articles/Posts Section - Coming Soon */}
      {/* <PageContainer variant="alt" className="border-t border-t-border-color">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="sm:text-xl text-lg font-semibold opacity-50">
            Articles by @{typedProfile.nickname}
          </h2>
          <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium opacity-50">
            Coming soon
          </span>
        </div>
        <p className="text-sm opacity-40">
          Articles and posts will be available here in a future update.
        </p>
      </PageContainer> */}
    </>
  );
}
