/** Columns needed for public photo list/grid views */
export const PHOTO_LIST_COLUMNS = [
  'id',
  'user_id',
  'url',
  'width',
  'height',
  'title',
  'blurhash',
  'likes_count',
  'short_id',
  'created_at',
  'is_public',
  'deleted_at',
  'storage_path',
  'view_count',
].join(', ');

/** Columns needed for challenge list cards */
export const CHALLENGE_LIST_COLUMNS = [
  'id',
  'slug',
  'title',
  'prompt',
  'starts_at',
  'ends_at',
  'cover_image_url',
  'image_blurhash',
  'is_active',
  'created_at',
  'created_by',
].join(', ');

/** Columns needed for interest list views */
export const INTEREST_LIST_COLUMNS = 'id, name, count';
