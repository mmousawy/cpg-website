import AlbumModerationPanel from '@/components/admin/AlbumModerationPanel';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import FullSizeGalleryButton from '@/components/photo/FullSizeGalleryButton';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import Comments from '@/components/shared/Comments';
import ContentHeader from '@/components/shared/ContentHeader';
import type { AlbumWithPhotos } from '@/types/albums';
import type { Photo } from '@/types/photos';
import { getAlbumBySlug, getPhotosByUrls } from '@/lib/data/albums';
import { notFound } from 'next/navigation';

type AlbumContentProps = {
  nickname: string;
  albumSlug: string;
};

export default async function AlbumContent({ nickname, albumSlug }: AlbumContentProps) {
  // Fetch album data
  const album = await getAlbumBySlug(nickname, albumSlug);

  if (!album) {
    notFound();
  }

  const moderationData = {
    is_suspended: (album as any)?.is_suspended || false,
    suspension_reason: (album as any)?.suspension_reason || null,
  };

  const albumWithPhotos = album as unknown as AlbumWithPhotos;

  // Sort photos by sort_order
  const sortedAlbumPhotos = [...(albumWithPhotos.photos || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Fetch photo metadata using cached function
  const photoUrls = sortedAlbumPhotos.map((p) => p.photo_url);
  const photosData = await getPhotosByUrls(photoUrls);

  // Create a map of url -> photo for quick lookup
  const photosMap = new Map((photosData || []).map((p) => [p.url, p as Photo]));

  // Convert album_photos to Photo format, preserving sort order
  const photos: Photo[] = sortedAlbumPhotos
    .map((ap) => {
      const photo = photosMap.get(ap.photo_url);
      if (!photo) return null;
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
          date={albumWithPhotos.created_at || ''}
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
