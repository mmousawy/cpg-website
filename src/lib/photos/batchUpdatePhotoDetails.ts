import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/database.types';
import type { BatchUpdatePhotoDetailsBody } from '@/lib/photos/batchUpdatePhotoDetailsSchema';
import { planPhotoTagSync } from '@/lib/photos/photoTagSync';

import type { BatchUpdatePhotoExifResult } from '@/lib/photos/batchUpdatePhotoExif';

export type BatchUpdatePhotoDetailsResult = {
  photoIds: string[];
  affectedAlbumSlugs: string[];
  affectedTags: string[];
  newlyPublicPhotoIds: string[];
  visibilityChanged: boolean;
  exif?: BatchUpdatePhotoExifResult;
};

type PhotoRow = {
  id: string;
  is_public: boolean;
  short_id: string | null;
  albums: { id: string; slug: string }[] | null;
};

function buildRpcUpdates(body: BatchUpdatePhotoDetailsBody): Record<string, unknown>[] {
  const photoIds = body.photoIds ?? [];
  const patch = body.patch ?? {};
  const { options, sortOrderByPhotoId } = body;
  const applyUnsetFields = options?.applyUnsetFields ?? false;

  return photoIds.map((id) => {
    const update: Record<string, unknown> = { id };

    if (applyUnsetFields) {
      if (patch.title !== undefined) update.title = patch.title;
      if (patch.description !== undefined) update.description = patch.description;
      if (patch.is_public !== undefined && patch.is_public !== null) {
        update.is_public = patch.is_public;
      }
      if (patch.license !== undefined && patch.license !== null) {
        update.license = patch.license;
      }
    } else {
      if (patch.title) update.title = patch.title;
      if (patch.description) update.description = patch.description;
      if (patch.is_public !== undefined && patch.is_public !== null) {
        update.is_public = patch.is_public;
      }
      if (patch.license) update.license = patch.license;
    }

    const sortOrder = sortOrderByPhotoId?.[id];
    if (sortOrder !== undefined) {
      update.sort_order = sortOrder;
    }

    return update;
  }).filter((row) => Object.keys(row).length > 1);
}

function hasPhotoFieldUpdates(body: BatchUpdatePhotoDetailsBody): boolean {
  const patch = body.patch ?? {};
  const { sortOrderByPhotoId } = body;
  const applyUnsetFields = body.options?.applyUnsetFields ?? false;

  if (sortOrderByPhotoId && Object.keys(sortOrderByPhotoId).length > 0) {
    return true;
  }

  if (applyUnsetFields) {
    return (
      patch.title !== undefined
      || patch.description !== undefined
      || (patch.is_public !== undefined && patch.is_public !== null)
      || (patch.license !== undefined && patch.license !== null)
    );
  }

  return Boolean(
    patch.title
    || patch.description
    || (patch.is_public !== undefined && patch.is_public !== null)
    || patch.license,
  );
}

export async function batchUpdatePhotoDetails(
  supabase: SupabaseClient<Database>,
  userId: string,
  body: BatchUpdatePhotoDetailsBody,
): Promise<BatchUpdatePhotoDetailsResult> {
  if (!body.photoIds?.length) {
    throw new Error('photoIds required');
  }

  const photoIds = body.photoIds;
  const patch = body.patch ?? {};
  const { options } = body;
  const tagMode = options?.tagMode ?? 'merge';
  const albumId = options?.albumId;

  const { data: photoRows, error: fetchError } = await supabase
    .from('photos')
    .select('id, is_public, short_id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .in('id', photoIds);

  if (fetchError) {
    throw new Error(fetchError.message || 'Failed to load photos');
  }

  const ownedIds = new Set((photoRows ?? []).map((row) => row.id));
  if (ownedIds.size !== photoIds.length) {
    throw new Error('One or more photos were not found');
  }

  const { data: albumLinks, error: albumLinksError } = await supabase
    .from('album_photos')
    .select('photo_id, albums!inner(slug)')
    .in('photo_id', photoIds);

  if (albumLinksError) {
    throw new Error(albumLinksError.message || 'Failed to load album links');
  }

  const albumsByPhotoId = new Map<string, { id: string; slug: string }[]>();
  for (const link of albumLinks ?? []) {
    const slug = (link.albums as { slug: string } | null)?.slug;
    if (!slug) continue;
    const list = albumsByPhotoId.get(link.photo_id) ?? [];
    list.push({ id: link.photo_id, slug });
    albumsByPhotoId.set(link.photo_id, list);
  }

  const previousById = new Map<string, PhotoRow>();
  for (const row of photoRows ?? []) {
    previousById.set(row.id, {
      id: row.id,
      is_public: row.is_public,
      short_id: row.short_id,
      albums: albumsByPhotoId.get(row.id) ?? [],
    });
  }

  if (hasPhotoFieldUpdates(body)) {
    const updates = buildRpcUpdates(body);
    if (updates.length > 0) {
      const { error } = await supabase.rpc('batch_update_photos', {
        photo_updates: updates as Json,
      });
      if (error) {
        throw new Error(error.message || 'Failed to update photos');
      }
    }

    if (albumId && patch.title != null) {
      const { error: albumTitleError } = await supabase
        .from('album_photos')
        .update({ title: patch.title })
        .eq('album_id', albumId)
        .in('photo_id', photoIds);

      if (albumTitleError) {
        throw new Error(albumTitleError.message || 'Failed to update album photo titles');
      }
    }
  }

  let affectedTags: string[] = [];

  if (patch.tags !== undefined) {
    const { data: existingTags, error: tagsError } = await supabase
      .from('photo_tags')
      .select('photo_id, tag')
      .in('photo_id', photoIds);

    if (tagsError) {
      throw new Error(tagsError.message || 'Failed to load photo tags');
    }

    const plan = planPhotoTagSync(existingTags ?? [], {
      photoIds,
      desiredTags: patch.tags,
      originalCommonTags: patch.originalCommonTags,
      mode: tagMode,
    });

    for (const { photo_id, tag } of plan.deletes) {
      const { error: deleteError } = await supabase
        .from('photo_tags')
        .delete()
        .eq('photo_id', photo_id)
        .eq('tag', tag);
      if (deleteError) {
        throw new Error(deleteError.message || 'Failed to remove tags');
      }
    }

    if (plan.inserts.length > 0) {
      const { error: insertError } = await supabase.from('photo_tags').insert(plan.inserts);
      if (insertError) {
        throw new Error(insertError.message || 'Failed to add tags');
      }
    }

    affectedTags = plan.affectedTags;
  }

  const affectedAlbumSlugs = new Set<string>();
  for (const id of photoIds) {
    const row = previousById.get(id);
    row?.albums?.forEach((album) => affectedAlbumSlugs.add(album.slug));
  }

  const targetIsPublic = patch.is_public;
  const newlyPublicPhotoIds: string[] = [];
  let visibilityChanged = false;

  if (targetIsPublic !== undefined && targetIsPublic !== null) {
    for (const id of photoIds) {
      const previous = previousById.get(id);
      if (!previous) continue;
      if (previous.is_public !== targetIsPublic) {
        visibilityChanged = true;
      }
      if (!previous.is_public && targetIsPublic) {
        newlyPublicPhotoIds.push(id);
      }
    }
  }

  return {
    photoIds,
    affectedAlbumSlugs: [...affectedAlbumSlugs],
    affectedTags,
    newlyPublicPhotoIds,
    visibilityChanged,
  };
}
