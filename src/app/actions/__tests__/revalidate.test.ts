import { beforeEach, describe, expect, it, vi } from 'vitest';

const { expireTag, revalidatePath, refresh } = vi.hoisted(() => ({
  expireTag: vi.fn(),
  revalidatePath: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/lib/cache/expireTag', () => ({ expireTag }));
vi.mock('next/cache', () => ({ revalidatePath, refresh }));

import * as R from '@/app/actions/revalidate';

function pathCalls(): string[] {
  return revalidatePath.mock.calls.map(([path]) => path as string);
}

function pathCallArgs(): Array<[string, string?]> {
  return revalidatePath.mock.calls.map((call) => [
    call[0] as string,
    call[1] as string | undefined,
  ]);
}

beforeEach(() => {
  expireTag.mockClear();
  revalidatePath.mockClear();
  refresh.mockClear();
});

describe('revalidateAlbum', () => {
  it('busts gallery listing routes and album detail', async () => {
    await R.revalidateAlbum('alice', 'my-album');

    expect(expireTag).toHaveBeenCalledWith('album-alice-my-album');
    expect(pathCalls()).toEqual(
      expect.arrayContaining([
        '/',
        '/gallery',
        '/gallery/albums',
        '/gallery/photos',
        '/gallery/recent-likes',
        '/@alice/album/my-album',
        '/@alice',
        '/@alice/albums',
        '/@alice/photos',
      ]),
    );
  });
});

describe('revalidateAlbumLikes', () => {
  it('expires album detail tags and busts album detail plus gallery listings', async () => {
    await R.revalidateAlbumLikes('a1', 'alice', 'my-album');

    expect(expireTag).toHaveBeenCalledWith('album-likes-a1');
    expect(expireTag).toHaveBeenCalledWith('album-alice-my-album');
    expect(expireTag).toHaveBeenCalledWith('albums');
    expect(pathCalls()).toEqual(
      expect.arrayContaining([
        '/@alice/album/my-album',
        '/gallery/albums',
        '/gallery/photos',
        '/gallery/recent-likes',
      ]),
    );
  });
});

describe('revalidatePhotoLikes', () => {
  it('expires photo detail tags and busts all photo route patterns', async () => {
    await R.revalidatePhotoLikes('p1', 'alice', 'sh0rt');

    expect(expireTag).toHaveBeenCalledWith('photo-likes-p1');
    expect(expireTag).toHaveBeenCalledWith('photo-sh0rt');
    expect(pathCallArgs()).toEqual(
      expect.arrayContaining([
        ['/[nickname]/photo/[photoId]', 'page'],
        ['/[nickname]/album/[albumSlug]/photo/[photoId]', 'page'],
        ['/events/[eventSlug]/photo/[photoId]', 'page'],
        ['/challenges/[slug]/photo/[photoId]', 'page'],
        ['/@alice/photo/sh0rt', undefined],
      ]),
    );
    expect(pathCalls()).toEqual(
      expect.arrayContaining(['/gallery/photos', '/gallery/albums']),
    );
  });
});

describe('revalidateEventAttendees', () => {
  it('scopes per event id and only busts the event detail page', async () => {
    await R.revalidateEventAttendees(42, 'my-event');

    expect(expireTag).toHaveBeenCalledWith('event-attendees-42');
    expect(expireTag).not.toHaveBeenCalledWith('event-attendees');
    expect(pathCalls()).toEqual(['/events/my-event']);
    expect(pathCalls()).not.toContain('/');
    expect(pathCalls()).not.toContain('/events');
  });

  it('falls back to the broad attendees tag when event id is missing', async () => {
    await R.revalidateEventAttendees(null, null);

    expect(expireTag).toHaveBeenCalledWith('event-attendees');
    expect(pathCalls()).toEqual([]);
  });
});

describe('revalidateChallengeColorDraws', () => {
  it('expires challenge draw tags and busts challenge detail', async () => {
    await R.revalidateChallengeColorDraws('c1', 'topic');

    expect(expireTag).toHaveBeenCalledWith('challenge-color-draws-c1');
    expect(expireTag).toHaveBeenCalledWith('challenge-topic');
    expect(pathCalls()).toContain('/challenges/topic');
  });
});

describe('revalidateChangelog', () => {
  it('busts changelog index and detail page patterns', async () => {
    await R.revalidateChangelog();

    expect(expireTag).toHaveBeenCalledWith('changelog');
    expect(pathCallArgs()).toEqual(
      expect.arrayContaining([
        ['/changelog', undefined],
        ['/changelog/[slug]', 'page'],
      ]),
    );
  });
});

describe('revalidateTagPhotos', () => {
  it('busts member and gallery tag pages plus members hub', async () => {
    await R.revalidateTagPhotos('street');

    expect(expireTag).toHaveBeenCalledWith('tag-street');
    expect(pathCalls()).toEqual(
      expect.arrayContaining([
        '/members/tag/street',
        '/gallery/tag/street',
        '/members',
        '/members/all',
      ]),
    );
  });
});

describe('revalidateFollow', () => {
  it('expires both profile tags and busts both profile routes', async () => {
    await R.revalidateFollow('alice', 'bob');

    expect(expireTag).toHaveBeenCalledWith('profile-alice');
    expect(expireTag).toHaveBeenCalledWith('profile-bob');
    expect(pathCalls()).toEqual(
      expect.arrayContaining([
        '/@alice',
        '/@alice/albums',
        '/@alice/photos',
        '/@bob',
        '/@bob/albums',
        '/@bob/photos',
      ]),
    );
  });
});

describe('revalidateProfile', () => {
  it('does not nuke gallery listings on pure profile edits', async () => {
    await R.revalidateProfile('alice');

    expect(pathCalls()).not.toContain('/gallery/albums');
    expect(pathCalls()).not.toContain('/gallery/photos');
    expect(pathCalls()).not.toContain('/gallery/recent-likes');
    expect(pathCalls()).toContain('/');
    expect(pathCalls()).toContain('/members');
    expect(pathCalls()).toContain('/@alice');
  });
});

describe('revalidatePhoto', () => {
  it('busts all four photo route patterns', async () => {
    await R.revalidatePhoto('sh0rt', 'alice');

    expect(pathCallArgs()).toEqual(
      expect.arrayContaining([
        ['/[nickname]/photo/[photoId]', 'page'],
        ['/[nickname]/album/[albumSlug]/photo/[photoId]', 'page'],
        ['/events/[eventSlug]/photo/[photoId]', 'page'],
        ['/challenges/[slug]/photo/[photoId]', 'page'],
        ['/@alice/photo/sh0rt', undefined],
      ]),
    );
  });
});

describe('revalidateEvents', () => {
  it('busts event listings and optional detail page', async () => {
    await R.revalidateEvents('my-event');

    expect(expireTag).toHaveBeenCalledWith('event-my-event');
    expect(pathCalls()).toEqual(
      expect.arrayContaining(['/', '/events', '/events/my-event']),
    );
  });
});

describe('revalidateChallenge', () => {
  it('expires challenge photo and draw tags and busts challenge detail', async () => {
    await R.revalidateChallenge('topic', 'c1');

    expect(expireTag).toHaveBeenCalledWith('challenge-photos-c1');
    expect(expireTag).toHaveBeenCalledWith('challenge-color-draws-c1');
    expect(expireTag).toHaveBeenCalledWith('challenge-topic');
    expect(pathCalls()).toContain('/challenges/topic');
  });
});

describe('revalidateSceneEvent', () => {
  it('expires scene detail tag and busts scene detail page', async () => {
    await R.revalidateSceneEvent('s1');

    expect(expireTag).toHaveBeenCalledWith('scene-s1');
    expect(pathCalls()).toContain('/scene/s1');
  });
});
