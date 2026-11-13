import { afterEach, describe, expect, it, vi } from 'vitest';

const preview = {
  id: 'user-1',
  nickname: 'karsten',
  full_name: 'Karsten',
  avatar_url: null,
  banner_url: null,
  banner_blurhash: null,
  bio: 'Photographer',
  photoCount: 12,
  albumCount: 4,
  followerCount: 3,
  followingCount: 1,
  gearLine: 'Shoots on Digital camera · Canon EOS 7D',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('normalizeMemberPreviewNickname', () => {
  it('trims, strips @, and lowercases', async () => {
    const { normalizeMemberPreviewNickname } = await import('./fetchMemberPreview');
    expect(normalizeMemberPreviewNickname(' @Karsten ')).toBe('karsten');
  });
});

describe('fetchMemberPreview', () => {
  it('caches a successful preview for later hovers in the session', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => preview,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchMemberPreview, getCachedMemberPreview } = await import('./fetchMemberPreview');

    await expect(fetchMemberPreview('@Karsten')).resolves.toEqual(preview);
    await expect(fetchMemberPreview('karsten')).resolves.toEqual(preview);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/profiles/karsten/preview');
    expect(getCachedMemberPreview('KARSTEN')).toEqual(preview);
  });

  it('caches 404s so missing profiles are not refetched', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Profile not found' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchMemberPreview, getCachedMemberPreview } = await import('./fetchMemberPreview');

    await expect(fetchMemberPreview('nobody')).resolves.toBeNull();
    await expect(fetchMemberPreview('nobody')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getCachedMemberPreview('nobody')).toBeNull();
  });
});
