import type { PhotoMemberTag } from '@/lib/data/photoMemberTags';

export type PhotoMemberTagsClientState = {
  tags: PhotoMemberTag[];
  canEdit: boolean;
  viewerId: string | null;
  loaded: boolean;
};

const EMPTY_STATE: PhotoMemberTagsClientState = {
  tags: [],
  canEdit: false,
  viewerId: null,
  loaded: false,
};

const stateByPhotoId = new Map<string, PhotoMemberTagsClientState>();
const listenersByPhotoId = new Map<string, Set<() => void>>();

function notify(photoId: string) {
  listenersByPhotoId.get(photoId)?.forEach((listener) => listener());
}

export function getPhotoMemberTagsClientState(photoId: string | undefined): PhotoMemberTagsClientState {
  if (!photoId) return EMPTY_STATE;
  return stateByPhotoId.get(photoId) ?? EMPTY_STATE;
}

export function subscribePhotoMemberTags(photoId: string | undefined, listener: () => void) {
  if (!photoId) return () => {};
  const listeners = listenersByPhotoId.get(photoId) ?? new Set();
  listeners.add(listener);
  listenersByPhotoId.set(photoId, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      listenersByPhotoId.delete(photoId);
    }
  };
}

export function seedPhotoMemberTagsClientState(
  photoId: string,
  state: Omit<PhotoMemberTagsClientState, 'loaded'> & { loaded?: boolean },
) {
  if (typeof window === 'undefined') return;
  stateByPhotoId.set(photoId, {
    tags: state.tags,
    canEdit: state.canEdit,
    viewerId: state.viewerId,
    loaded: state.loaded ?? true,
  });
  notify(photoId);
}

export function updatePhotoMemberTagsClientState(
  photoId: string,
  patch: Partial<PhotoMemberTagsClientState>,
) {
  const current = getPhotoMemberTagsClientState(photoId);
  stateByPhotoId.set(photoId, {
    ...current,
    ...patch,
    loaded: patch.loaded ?? current.loaded,
  });
  notify(photoId);
}
