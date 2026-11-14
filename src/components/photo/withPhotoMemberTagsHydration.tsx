import PhotoMemberTagsHydration from '@/components/photo/PhotoMemberTagsHydration';
import type { PhotoMemberTag } from '@/lib/data/photoMemberTags';
import { getPhotoMemberTagsPageAuth } from '@/lib/data/photoMemberTags';
import type { ReactNode } from 'react';

export async function withPhotoMemberTagsHydration(
  photoId: string,
  photoUserId: string | null,
  memberTags: PhotoMemberTag[],
  children: ReactNode,
) {
  const { canEdit, viewerId } = await getPhotoMemberTagsPageAuth(photoUserId);

  return (
    <PhotoMemberTagsHydration
      photoId={photoId}
      memberTags={memberTags}
      canEdit={canEdit}
      viewerId={viewerId}
    >
      {children}
    </PhotoMemberTagsHydration>
  );
}
