import type { StreamPhoto } from '@/lib/data/gallery';
import type { Photo } from '@/types/photos';
import type { PhotoCaptionsMode, PhotoGridDensity, PhotoGridStyle } from '@/utils/displayPreferences';

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
  /** Override saved photo grid style preference */
  gridStyle?: PhotoGridStyle;
  /** Override saved photo grid density preference */
  gridDensity?: PhotoGridDensity;
  /** Override saved photo captions preference */
  captions?: PhotoCaptionsMode;
};

export type JustifiedPhotoGridCoreProps = Omit<JustifiedPhotoGridProps, 'liveLikeCounts'> & {
  batchLikesMap: Map<string, number>;
  captionMode?: PhotoCaptionsMode;
  targetRowHeightMobile?: number;
  targetRowHeightTablet?: number;
  targetRowHeightDesktop?: number;
};
