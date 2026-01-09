import AlbumModerationPanel from '@/components/admin/AlbumModerationPanel';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import FullSizeGalleryButton from '@/components/photo/FullSizeGalleryButton';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import Comments from '@/components/shared/Comments';
import ContentHeader from '@/components/shared/ContentHeader';
import type { AlbumWithPhotos } from '@/types/albums';
import type { Photo } from '@/types/photos';
import { createPublicClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';

// Cache indefinitely - revalidated on-demand when data changes

export async function generateMetadata({ params }: { params: Promise<{ nickname: string; albumSlug: string }> }) {
  const resolvedParams = await params;
  // Decode URL parameters and remove @ prefix from nickname if present
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';

  if (!nickname || !albumSlug) {
    return {
      title: 'Album Not Found',
    };
  }

  const supabase = createPublicClient();

  // First get the user by nickname
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .single();

  if (!profile) {
    return {
      title: 'Album Not Found',
    };
  }

  const { data: album } = await supabase
    .from('albums')
    .select('title, description')
    .eq('user_id', profile.id)
    .eq('slug', albumSlug)
    .eq('is_public', true)
    .single();

  if (!album) {
    return {
      title: 'Album Not Found',
    };
  }

  return {
    title: `${album.title} by @${nickname}`,
    description: album.description || `Photo album "${album.title}" by @${nickname}`,
  };
}

export default async function PublicAlbumPage({ params }: { params: Promise<{ nickname: string; albumSlug: string }> }) {
  const resolvedParams = await params;
  // Decode URL parameters and remove @ prefix from nickname if present
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');
  const nickname = rawNickname.startsWith('@') ? rawNickname.slice(1) : rawNickname;
  const albumSlug = resolvedParams?.albumSlug || '';

  const supabase = createPublicClient();

  // First get the user by nickname
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Single query for album with photos and moderation data
  const { data: album, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      is_public,
      created_at,
      is_suspended,
      suspension_reason,
      profile:profiles(full_name, avatar_url, nickname),
      photos:album_photos(
        id,
        photo_url,
        title,
        width,
        height,
        sort_order
      )
    `)
    .eq('user_id', profile.id)
    .eq('slug', albumSlug)
    .eq('is_public', true)
    .order('sort_order', { referencedTable: 'album_photos', ascending: true, nullsFirst: false })
    .single();

  if (error || !album) {
    notFound();
  }

  const moderationData = {
    is_suspended: (album as any)?.is_suspended || false,
    suspension_reason: (album as any)?.suspension_reason || null,
  };

  const albumWithPhotos = album as unknown as AlbumWithPhotos;

  // Sort photos by sort_order
  const sortedAlbumPhotos = [...albumWithPhotos.photos].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Fetch photo metadata for each photo_url
  const photoUrls = sortedAlbumPhotos.map((p) => p.photo_url);
  const { data: photosData } = await supabase
    .from('photos')
    .select('*')
    .in('url', photoUrls);

  // Create a map of url -> photo for quick lookup
  const photosMap = new Map((photosData || []).map((p) => [p.url, p as Photo]));

  // Convert album_photos to Photo format, preserving sort order
  const photos: Photo[] = sortedAlbumPhotos
    .map((ap) => {
      const photo = photosMap.get(ap.photo_url);
      if (!photo) return null;
      // Use album_photo title if available, otherwise use photo title
      return {
        ...photo,
        title: ap.title || photo.title,
      } as Photo;
    })
    .filter((p): p is Photo => p !== null);

  return (
    <>
      <PageContainer className="!pb-0">
        <ContentHeader
          title={albumWithPhotos.title}
          description={albumWithPhotos.description}
          profile={{
            full_name: albumWithPhotos.profile?.full_name || null,
            nickname: albumWithPhotos.profile?.nickname || nickname,
            avatar_url: albumWithPhotos.profile?.avatar_url || null,
          }}
          date={albumWithPhotos.created_at || new Date().toISOString()}
          metadata={[`${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`]}
        />
        <FullSizeGalleryButton photos={photos} className="mt-4 text-xs" />
      </PageContainer>

      {/* Gallery - Wide container */}
      <WidePageContainer>
        {photos.length === 0 ? (
          <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
            <p className="opacity-70">
              This album doesn&apos;t have any photos yet.
            </p>
          </div>
        ) : (
          <JustifiedPhotoGrid photos={photos} profileNickname={nickname} albumSlug={albumSlug} />
        )}
      </WidePageContainer>

      <PageContainer className="!pt-0">
        {/* Admin Moderation Panel */}
        <AlbumModerationPanel
          albumId={albumWithPhotos.id}
          albumTitle={albumWithPhotos.title}
          ownerNickname={albumWithPhotos.profile?.nickname || 'unknown'}
          isSuspended={moderationData.is_suspended}
          suspensionReason={moderationData.suspension_reason}
        />
      </PageContainer>

      <PageContainer variant="alt" className="border-t border-t-border-color">
        <Comments albumId={albumWithPhotos.id} />
      </PageContainer>
    </>
  );
}
