export type MemberPreview = {
  id: string;
  nickname: string;
  full_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  banner_blurhash: string | null;
  bio: string | null;
  photoCount: number;
  albumCount: number;
  followerCount: number;
  followingCount: number;
  gearLine: string | null;
};

const previewCache = new Map<string, MemberPreview | null>();
const inflight = new Map<string, Promise<MemberPreview | null>>();

export function normalizeMemberPreviewNickname(nickname: string): string {
  return nickname.trim().replace(/^@/, '').toLowerCase();
}

/** `undefined` when this nickname has not been fetched yet. */
export function getCachedMemberPreview(nickname: string): MemberPreview | null | undefined {
  const key = normalizeMemberPreviewNickname(nickname);
  if (!key || !previewCache.has(key)) return undefined;
  return previewCache.get(key);
}

export async function fetchMemberPreview(nickname: string): Promise<MemberPreview | null> {
  const key = normalizeMemberPreviewNickname(nickname);
  if (!key) return null;

  if (previewCache.has(key)) {
    return previewCache.get(key) ?? null;
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const request = (async () => {
    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(key)}/preview`);
      if (response.status === 404) {
        previewCache.set(key, null);
        return null;
      }
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as MemberPreview;
      previewCache.set(key, data);
      return data;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}
