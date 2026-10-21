export type ViewEntityType = 'photo' | 'album' | 'profile';

const viewTableByType: Record<ViewEntityType, 'photos' | 'albums' | 'profiles'> = {
  photo: 'photos',
  album: 'albums',
  profile: 'profiles',
};

/**
 * Fire-and-forget view tracking (or fetch-only in development).
 * Returns the current view_count when the API includes it.
 */
export function recordView(type: ViewEntityType, id: string): Promise<number | null> {
  if (!id) {
    return Promise.resolve(null);
  }

  const isDev = process.env.NODE_ENV === 'development';
  const table = viewTableByType[type];

  if (isDev) {
    return fetch(`/api/views?table=${table}&id=${id}`)
      .then((res) => res.json())
      .then((data) => (data.view_count != null ? data.view_count as number : null))
      .catch(() => null);
  }

  return fetch('/api/views', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, id }),
    keepalive: true,
  })
    .then((res) => res.json())
    .then((data) => (data.view_count != null ? data.view_count as number : null))
    .catch(() => null);
}
