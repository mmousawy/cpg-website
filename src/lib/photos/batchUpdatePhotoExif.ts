import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/database.types';
import type { ExifBatchInput } from '@/lib/photos/exifFormSchema';
import { toExifFormValues } from '@/lib/photos/exifFormSchema';
import {
  exifGearFieldsChanged,
  mergeExifEdits,
  mergeExifEditsPartial,
} from '@/utils/exif';

export type BatchUpdatePhotoExifResult = {
  results: Array<{
    photoId: string;
    shortId: string | null;
    gearChanged: boolean;
  }>;
};

export async function batchUpdatePhotoExif(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: ExifBatchInput,
): Promise<BatchUpdatePhotoExifResult> {
  const photoIds = input.photoIds;

  const { data: rows, error: fetchError } = await supabase
    .from('photos')
    .select('id, exif_data, short_id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .in('id', photoIds);

  if (fetchError) {
    throw new Error(fetchError.message || 'Failed to load photo metadata');
  }

  const rowById = new Map((rows ?? []).map((row) => [row.id, row]));
  if (rowById.size !== photoIds.length) {
    throw new Error('One or more photos were not found');
  }

  const results: BatchUpdatePhotoExifResult['results'] = [];
  const rpcUpdates: { id: string; exif_data: Json }[] = [];

  for (const photoId of photoIds) {
    const row = rowById.get(photoId)!;
    const baseExif = row.exif_data as Record<string, unknown> | null;

    const merged = input.action === 'clear'
      ? null
      : input.partial
        ? mergeExifEditsPartial(baseExif, toExifFormValues(input.form), input.mergeOptions ?? {})
        : mergeExifEdits(baseExif, toExifFormValues(input.form));

    const gearChanged = exifGearFieldsChanged(baseExif, merged);

    results.push({
      photoId,
      shortId: row.short_id,
      gearChanged,
    });

    rpcUpdates.push({
      id: photoId,
      exif_data: merged as Json,
    });
  }

  const { error } = await supabase.rpc('batch_update_photo_exif', {
    photo_updates: rpcUpdates,
  });

  if (error) {
    throw new Error(error.message || 'Failed to update capture details');
  }

  return { results };
}
