'use client';

import type { PhotoMemberTag } from '@/lib/data/photoMemberTags';
import { seedPhotoMemberTagsClientState } from '@/lib/photoMemberTags/clientStore';
import { useLayoutEffect, type ReactNode } from 'react';

type PhotoMemberTagsHydrationProps = {
  photoId: string;
  memberTags: PhotoMemberTag[];
  canEdit: boolean;
  viewerId: string | null;
  children: ReactNode;
};

/**
 * Seeds shared client state before photo tag UI mounts (sidebar list + stage dots).
 */
export default function PhotoMemberTagsHydration({
  photoId,
  memberTags,
  canEdit,
  viewerId,
  children,
}: PhotoMemberTagsHydrationProps) {
  useLayoutEffect(() => {
    seedPhotoMemberTagsClientState(photoId, {
      tags: memberTags,
      canEdit,
      viewerId,
      loaded: true,
    });
  }, [photoId, memberTags, canEdit, viewerId]);

  return children;
}
