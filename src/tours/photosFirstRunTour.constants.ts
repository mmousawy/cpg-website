export const PHOTOS_TOUR_QUERY_PARAM = 'tour';
export const PHOTOS_TOUR_QUERY_VALUE = 'photos';
export const PHOTOS_MANAGE_TOUR_QUERY_VALUE = 'photos-edit';

export const PHOTOS_TOUR_TARGETS = {
  library: '#photos-tour-library',
  upload: '#photos-tour-upload',
  editSidebar: '#photos-tour-edit-sidebar',
  albumsTab: '#photos-tour-albums-tab',
  help: '#photos-tour-help',
} as const;

export const PHOTOS_MANAGE_TOUR_TARGETS = {
  selectPhoto: '#photos-tour-select-photo',
  editForm: '#photos-tour-edit-form',
  sidebarAlbum: '#photos-tour-sidebar-album',
  mobileAlbum: '#photos-tour-mobile-album',
  mobileEdit: '#photos-tour-mobile-edit',
  filter: '#photos-tour-filter',
} as const;

export function isPhotosTourMockMode(
  searchParams: Pick<URLSearchParams, 'get'> | null | undefined,
): boolean {
  return searchParams?.get(PHOTOS_TOUR_QUERY_PARAM) === PHOTOS_TOUR_QUERY_VALUE;
}

export function isPhotosManageTourMockMode(
  searchParams: Pick<URLSearchParams, 'get'> | null | undefined,
): boolean {
  return searchParams?.get(PHOTOS_TOUR_QUERY_PARAM) === PHOTOS_MANAGE_TOUR_QUERY_VALUE;
}

