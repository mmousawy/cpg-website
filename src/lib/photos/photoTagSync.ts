export type PhotoTagSyncInput = {
  photoIds: string[];
  desiredTags: string[];
  originalCommonTags?: string[];
  mode: 'merge' | 'replace';
};

export type PhotoTagSyncPlan = {
  inserts: { photo_id: string; tag: string }[];
  deletes: { photo_id: string; tag: string }[];
  affectedTags: string[];
};

const MAX_TAGS_PER_PHOTO = 5;

/**
 * Plan tag inserts/deletes for bulk merge (common-tag UI) or full replace (single-photo edit).
 */
export function planPhotoTagSync(
  existingRows: { photo_id: string; tag: string }[],
  input: PhotoTagSyncInput,
): PhotoTagSyncPlan {
  const desiredTags = new Set(input.desiredTags.map((t) => t.toLowerCase()));
  const tagsByPhoto = new Map<string, Set<string>>();

  for (const { photo_id, tag } of existingRows) {
    if (!tagsByPhoto.has(photo_id)) {
      tagsByPhoto.set(photo_id, new Set());
    }
    tagsByPhoto.get(photo_id)!.add(tag.toLowerCase());
  }

  const inserts: { photo_id: string; tag: string }[] = [];
  const deletes: { photo_id: string; tag: string }[] = [];

  if (input.mode === 'replace') {
    for (const photoId of input.photoIds) {
      const existing = tagsByPhoto.get(photoId) ?? new Set<string>();
      for (const tag of existing) {
        if (!desiredTags.has(tag)) {
          deletes.push({ photo_id: photoId, tag });
        }
      }
      for (const tag of desiredTags) {
        if (!existing.has(tag)) {
          inserts.push({ photo_id: photoId, tag });
        }
      }
    }

    return {
      inserts,
      deletes,
      affectedTags: [...new Set([...desiredTags, ...deletes.map((d) => d.tag)])],
    };
  }

  const originalCommonTags = new Set(
    (input.originalCommonTags ?? []).map((t) => t.toLowerCase()),
  );
  const explicitlyRemovedTags = new Set(
    [...originalCommonTags].filter((tag) => !desiredTags.has(tag)),
  );

  for (const photoId of input.photoIds) {
    const existing = tagsByPhoto.get(photoId) ?? new Set<string>();

    for (const tag of desiredTags) {
      if (
        !existing.has(tag)
        && existing.size + inserts.filter((row) => row.photo_id === photoId).length < MAX_TAGS_PER_PHOTO
      ) {
        inserts.push({ photo_id: photoId, tag });
      }
    }

    for (const tag of existing) {
      if (explicitlyRemovedTags.has(tag)) {
        deletes.push({ photo_id: photoId, tag });
      }
    }
  }

  return {
    inserts,
    deletes,
    affectedTags: [...new Set([...desiredTags, ...explicitlyRemovedTags])],
  };
}
