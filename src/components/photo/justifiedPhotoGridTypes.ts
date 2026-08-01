import type { StreamPhoto } from '@/lib/data/gallery';
import type { Photo } from '@/types/photos';

export type JustifiedPhotoGridProps = {
  photos: Photo[] | StreamPhoto[];
  profileNickname?: string;
  albumSlug?: string;
  challengeSlug?: string;
  eventSlug?: string;
  showAttribution?: boolean;
  maxRowHeight?: number;
  minPhotosPerRow?: number;
  header?: React.ReactNode;
  /** When false, uses server-provided likes_count without client refetch */
  liveLikeCounts?: boolean;
};

export type JustifiedPhotoGridCoreProps = Omit<JustifiedPhotoGridProps, 'liveLikeCounts'> & {
  batchLikesMap: Map<string, number>;
};
