'use client';

import type { PhotoMemberTag } from '@/lib/data/photoMemberTags';
import { seedPhotoMemberTagsClientState } from '@/lib/photoMemberTags/clientStore';
import { useLayoutEffect, type ReactNode } from 'react';

type PhotoMemberTagsHydrationProps = {
  photoId: string;
  memberTags: PhotoMemberTag[];
  canEdit: boolean;
  viewerId: string | null;
  /** When true, the client fetches edit rights so a stale session can refresh in a route handler. */
  deferAuth?: boolean;
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
  deferAuth = false,
  children,
}: PhotoMemberTagsHydrationProps) {
  useLayoutEffect(() => {
    seedPhotoMemberTagsClientState(photoId, {
      tags: memberTags,
      canEdit,
      viewerId,
      loaded: !deferAuth,
    });
  }, [photoId, memberTags, canEdit, viewerId, deferAuth]);

  return children;
}
