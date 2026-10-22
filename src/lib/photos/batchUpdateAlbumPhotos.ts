import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/database.types';

export type AlbumPhotoBatchUpdate = {
  id: string;
  sort_order?: number;
  title?: string | null;
};

export async function batchUpdateAlbumPhotos(
  supabase: SupabaseClient<Database>,
  updates: AlbumPhotoBatchUpdate[],
): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  const rpcPayload = updates.map((row) => ({
    id: row.id,
    ...(row.sort_order !== undefined ? { sort_order: row.sort_order } : {}),
    ...(row.title !== undefined ? { title: row.title } : {}),
  }));

  const { error } = await supabase.rpc('batch_update_album_photos', {
    photo_updates: rpcPayload as Json,
  });

  if (error) {
    throw new Error(error.message || 'Failed to update album photos');
  }
}
