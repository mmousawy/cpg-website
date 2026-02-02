'use client';

import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import type { StreamPhoto } from '@/lib/data/gallery';
import type { ChallengePhoto } from '@/types/challenges';

type ChallengeGalleryProps = {
  photos: ChallengePhoto[];
};

/**
 * Transform ChallengePhoto to StreamPhoto format for JustifiedPhotoGrid.
 * Includes profile data for attribution display.
 */
function transformPhotos(photos: ChallengePhoto[]): StreamPhoto[] {
  return photos.map((photo) => ({
    id: photo.photo_id,
    short_id: photo.short_id,
    url: photo.url,
    width: photo.width || 800,
    height: photo.height || 600,
    title: photo.title,
    blurhash: photo.blurhash,
    user_id: photo.user_id,
    profile: photo.profile_nickname
      ? {
        nickname: photo.profile_nickname,
        full_name: photo.profile_full_name,
        avatar_url: photo.profile_avatar_url,
      }
      : null,
  })) as StreamPhoto[];
}

export default function ChallengeGallery({ photos }: ChallengeGalleryProps) {
  const gridPhotos = transformPhotos(photos);

  return (
    <JustifiedPhotoGrid
      photos={gridPhotos}
      showAttribution={true}
    />
  );
}
