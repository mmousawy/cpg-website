import type { AlbumWithPhotos } from '@/types/albums';
import type { PhotoWithAlbums } from '@/types/photos';
import type { ConfirmOptions } from '@/app/providers/ConfirmProvider';
import AlbumListItem from '@/components/manage/AlbumListItem';
import PhotoListItem from '@/components/manage/PhotoListItem';

/**
 * Helper functions to create common confirm dialog configurations
 */

export function confirmDeletePhotos(
  photos: PhotoWithAlbums[],
  count?: number,
): ConfirmOptions {
  const photoCount = count ?? photos.length;
  return {
    title: 'Delete photos',
    message: `Are you sure you want to delete ${photoCount} photo${photoCount !== 1 ? 's' : ''}? This action cannot be undone.`,
    content: (
      <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
        {photos.map((photo) => (
          <PhotoListItem key={photo.id} photo={photo} variant="detailed" />
        ))}
      </div>
    ),
    confirmLabel: 'Delete',
    variant: 'danger',
  };
}

export function confirmDeletePhoto(photo: PhotoWithAlbums): ConfirmOptions {
  return {
    title: 'Delete Photo',
    message: 'Are you sure you want to delete this photo? This action cannot be undone.',
    content: (
      <div className="grid gap-2">
        <PhotoListItem photo={photo} variant="detailed" />
      </div>
    ),
    confirmLabel: 'Delete',
    variant: 'danger',
  };
}

export function confirmDeleteAlbums(
  albums: AlbumWithPhotos[],
  count?: number,
): ConfirmOptions {
  const albumCount = count ?? albums.length;
  return {
    title: 'Delete Albums',
    message: `Are you sure you want to delete ${albumCount} album${albumCount !== 1 ? 's' : ''}? This action cannot be undone.`,
    content: (
      <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
        {albums.map((album) => (
          <AlbumListItem key={album.id} album={album} variant="detailed" />
        ))}
      </div>
    ),
    confirmLabel: 'Delete',
    variant: 'danger',
  };
}

export function confirmDeleteAlbum(album: AlbumWithPhotos): ConfirmOptions {
  return {
    title: 'Delete Album',
    message: 'Are you sure you want to delete this album? This action cannot be undone.',
    content: <AlbumListItem album={album} variant="compact" />,
    confirmLabel: 'Delete',
    variant: 'danger',
  };
}

export function confirmUnsavedChanges(): ConfirmOptions {
  return {
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Are you sure you want to leave without saving?',
    confirmLabel: 'Leave',
    variant: 'danger',
  };
}

export function confirmRemoveFromAlbum(
  photos: PhotoWithAlbums[],
  count?: number,
): ConfirmOptions {
  const photoCount = count ?? photos.length;
  return {
    title: 'Remove from Album',
    message: `Are you sure you want to remove ${photoCount} photo${photoCount !== 1 ? 's' : ''} from this album?`,
    content: (
      <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
        {photos.map((photo) => (
          <PhotoListItem key={photo.id} photo={photo} variant="compact" />
        ))}
      </div>
    ),
    confirmLabel: 'Remove',
    variant: 'danger',
  };
}

export function confirmDeleteEvent(): ConfirmOptions {
  return {
    title: 'Delete Event',
    message: 'Are you sure you want to delete this event? This action cannot be undone and will remove all RSVPs.',
    confirmLabel: 'Delete',
    variant: 'danger',
  };
}

export function confirmCancelRSVP(): ConfirmOptions {
  return {
    title: 'Cancel RSVP',
    message: 'Are you sure you want to cancel this RSVP?',
    confirmLabel: 'Cancel RSVP',
    variant: 'danger',
  };
}

export function confirmDeleteComment(): ConfirmOptions {
  return {
    title: 'Delete Comment',
    message: 'Are you sure you want to delete this comment?',
    confirmLabel: 'Delete',
    variant: 'danger',
  };
}
