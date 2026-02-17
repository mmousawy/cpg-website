'use client';

import SubmitToSharedAlbumButton from '@/components/albums/SubmitToSharedAlbumButton';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import { useAuth } from '@/hooks/useAuth';
import type { StreamPhoto } from '@/lib/data/gallery';
import type { EventAlbum } from '@/lib/eventAlbums';

type EventPhotosSectionProps = {
  eventId: number;
  eventSlug: string;
  album: EventAlbum | null;
  /** When 'gridOnly', renders only the photo grid (parent renders heading + button in Container) */
  variant?: 'full' | 'gridOnly';
};

/**
 * Transform event album photos to StreamPhoto format for JustifiedPhotoGrid.
 */
function transformToStreamPhotos(photos: EventAlbum['photos']): StreamPhoto[] {
  if (!photos) return [];

  return photos
    .filter((p) => p.photo?.id && p.photo?.url)
    .map((p) => ({
      id: p.photo!.id,
      short_id: p.photo!.short_id ?? '',
      url: p.photo!.url,
      width: p.photo!.width || p.width || 800,
      height: p.photo!.height || p.height || 600,
      title: p.title || p.photo!.title,
      blurhash: p.photo!.blurhash,
      user_id: p.photo!.user_id ?? '',
      profile: p.contributor?.nickname
        ? {
          nickname: p.contributor.nickname,
          full_name: p.contributor.full_name ?? null,
          avatar_url: p.contributor.avatar_url ?? null,
        }
        : null,
    })) as StreamPhoto[];
}

/** Heading for Event photos section */
export function EventPhotosHeading({ photoCount }: { photoCount: number }) {
  return (
    <h2
      className="text-lg font-semibold"
    >
      Event photos
      {photoCount > 0 && (
        <span
          className="text-foreground/50 font-normal ml-2"
        >
          {photoCount}
        </span>
      )}
    </h2>
  );
}

/** Add photos button for event album */
export function EventPhotosAddButton({
  albumId,
  albumTitle,
  albumSlug,
  ownerNickname,
  maxPhotosPerUser,
  inline,
}: {
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  ownerNickname: string | null;
  maxPhotosPerUser?: number | null;
  /** When true, no top margin (for use in header row) */
  inline?: boolean;
}) {
  return (
    <div
      className={inline ? undefined : 'mt-4'}
    >
      <SubmitToSharedAlbumButton
        albumId={albumId}
        albumTitle={albumTitle}
        albumSlug={albumSlug}
        ownerNickname={ownerNickname}
        maxPhotosPerUser={maxPhotosPerUser}
        canAddPhotos={true}
      />
    </div>
  );
}

function Header({ photoCount, album, albumSlug, ownerNickname }: { photoCount: number; album: EventAlbum; albumSlug: string; ownerNickname: string | null }) {
  const { user } = useAuth();

  return (
    <div
      className="flex items-center justify-between mb-6"
    >
      <EventPhotosHeading
        photoCount={photoCount}
      />
      {user && (
        <EventPhotosAddButton
          albumId={album.id}
          albumTitle={album.title}
          albumSlug={albumSlug}
          ownerNickname={ownerNickname}
          maxPhotosPerUser={album.max_photos_per_user}
          inline
        />
        )}
    </div>
  );
}

export default function EventPhotosSection({
  eventId,
  eventSlug,
  album,
  variant = 'full',
}: EventPhotosSectionProps) {
  const ownerNickname = album?.profile?.nickname ?? null;
  const albumSlug = album?.slug ?? '';

  if (!album) return null;

  const gridPhotos = transformToStreamPhotos(album.photos);

  if (variant === 'gridOnly') {
    return (
      <JustifiedPhotoGrid
        photos={gridPhotos}
        showAttribution={true}
      />
    );
  }

  return (
    <div
      className="mb-4"
    >
      {gridPhotos.length > 0 ? (
        <JustifiedPhotoGrid
          photos={gridPhotos}
          showAttribution={true}
          header={<Header
            photoCount={gridPhotos.length}
            album={album}
            albumSlug={albumSlug}
            ownerNickname={ownerNickname}
          />}
        />
      ) : (
        <>
          <Header
            photoCount={gridPhotos.length}
            album={album}
            albumSlug={albumSlug}
            ownerNickname={ownerNickname}
          />
          <div
            className="rounded-lg border border-border-color bg-background-light p-8 text-center"
          >
            <p
              className="text-foreground/70"
            >
              No photos yet. Be the first to add yours!
            </p>
          </div>
        </>
      )}
    </div>
  );
}
