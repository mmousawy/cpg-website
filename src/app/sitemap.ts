import { MetadataRoute } from 'next';
import { isPublicProfileAllowed } from '@/lib/auth/isTestProfile';
import { getAllChallengeSlugs } from '@/lib/data/challenges';
import { getPopularTags, getPopularTagsWithMemberCounts } from '@/lib/data/gallery';
import { getAllEventSlugs } from '@/lib/data/events';
import { getUpcomingSceneEvents } from '@/lib/data/scene';
import {
  MIN_INDEXABLE_INTEREST_MEMBERS,
  MIN_INDEXABLE_TAG_MEMBERS,
  MIN_INDEXABLE_TAG_PHOTOS,
} from '@/lib/seoThresholds';
import { createPublicClient } from '@/utils/supabase/server';
import type { Tables } from '@/database.types';

const baseUrl = 'https://creativephotography.group';

function lastModifiedFromIso(iso: string | null | undefined): Date | undefined {
  return iso ? new Date(iso) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/events`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/challenges`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gallery`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gallery/photos`,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/gallery/albums`,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/members`,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/changelog`,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/scene`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/help`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('nickname, updated_at')
    .not('nickname', 'is', null)
    .is('suspended_at', null)
    .is('deletion_scheduled_at', null);

  type ProfileRow = Pick<Tables<'profiles'>, 'nickname' | 'updated_at'>;
  const profilePages: MetadataRoute.Sitemap = (profileRows || [])
    .filter((p: ProfileRow) => p.nickname && isPublicProfileAllowed(p.nickname, false))
    .map((p: ProfileRow) => ({
      url: `${baseUrl}/@${p.nickname}`,
      lastModified: lastModifiedFromIso(p.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  const { data: albumRows } = await supabase
    .from('albums')
    .select('slug, updated_at, profile:profiles!albums_user_id_fkey(nickname)')
    .eq('is_public', true)
    .is('deleted_at', null);

  type AlbumRow = Pick<Tables<'albums'>, 'slug' | 'updated_at'>;
  type AlbumProfileRow = Pick<Tables<'profiles'>, 'nickname'>;
  type AlbumQueryResult = AlbumRow & {
    profile: AlbumProfileRow | null;
  };

  const albumPages: MetadataRoute.Sitemap = (albumRows || [])
    .filter((a: AlbumQueryResult): a is AlbumQueryResult & { profile: AlbumProfileRow } => {
      return !!a.slug && !!a.profile?.nickname && isPublicProfileAllowed(a.profile.nickname, false);
    })
    .map((a) => ({
      url: `${baseUrl}/@${a.profile.nickname}/album/${a.slug}`,
      lastModified: lastModifiedFromIso(a.updated_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const { data: photos } = await supabase
    .from('photos')
    .select('short_id, user_id, created_at, profiles!photos_user_id_fkey(nickname)')
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('short_id', 'is', null);

  type PhotoRow = Pick<Tables<'photos'>, 'short_id' | 'user_id' | 'created_at'>;
  type PhotoProfileRow = Pick<Tables<'profiles'>, 'nickname'>;
  type PhotoQueryResult = PhotoRow & {
    profiles: PhotoProfileRow | null;
  };

  const photoPages: MetadataRoute.Sitemap = (photos || [])
    .filter((photo: PhotoQueryResult) => {
      const profile = Array.isArray(photo.profiles) ? photo.profiles[0] : photo.profiles;
      return !!profile?.nickname && isPublicProfileAllowed(profile.nickname, false);
    })
    .map((photo: PhotoQueryResult) => {
      const profile = Array.isArray(photo.profiles) ? photo.profiles[0] : photo.profiles;
      return {
        url: `${baseUrl}/@${profile!.nickname}/photo/${photo.short_id}`,
        lastModified: lastModifiedFromIso(photo.created_at),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      };
    });

  const { data: eventRows } = await supabase
    .from('events')
    .select('slug, created_at')
    .eq('is_draft', false)
    .not('slug', 'is', null);

  type EventRow = Pick<Tables<'events'>, 'slug' | 'created_at'>;
  const eventPages: MetadataRoute.Sitemap = (eventRows || [])
    .filter((e: EventRow): e is EventRow & { slug: string } => e.slug !== null)
    .map((e) => ({
      url: `${baseUrl}/events/${e.slug}`,
      lastModified: lastModifiedFromIso(e.created_at),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

  const { data: challengeRows } = await supabase
    .from('challenges')
    .select('slug, updated_at')
    .eq('is_active', true)
    .not('slug', 'is', null);

  type ChallengeRow = Pick<Tables<'challenges'>, 'slug' | 'updated_at'>;
  const challengePages: MetadataRoute.Sitemap = (challengeRows || [])
    .filter((c: ChallengeRow): c is ChallengeRow & { slug: string } => c.slug !== null)
    .map((c) => ({
      url: `${baseUrl}/challenges/${c.slug}`,
      lastModified: lastModifiedFromIso(c.updated_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const popularTags = await getPopularTags(10_000);
  const galleryTagPages: MetadataRoute.Sitemap = popularTags
    .filter((tag) => (tag.count || 0) >= MIN_INDEXABLE_TAG_PHOTOS)
    .map((tag) => ({
      url: `${baseUrl}/gallery/tag/${encodeURIComponent(tag.name)}`,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  const memberTagPages: MetadataRoute.Sitemap = (await getPopularTagsWithMemberCounts(10_000))
    .filter((tag) => (tag.memberCount || 0) >= MIN_INDEXABLE_TAG_MEMBERS)
    .map((tag) => ({
      url: `${baseUrl}/members/tag/${encodeURIComponent(tag.name)}`,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  const { events: upcomingSceneEvents } = await getUpcomingSceneEvents();
  const scenePages: MetadataRoute.Sitemap = upcomingSceneEvents.map((event) => ({
    url: `${baseUrl}/scene/${event.slug}`,
    lastModified: lastModifiedFromIso(event.created_at),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const { data: interests } = await supabase
    .from('interests')
    .select('name')
    .gte('count', MIN_INDEXABLE_INTEREST_MEMBERS);

  const interestPages: MetadataRoute.Sitemap = (interests || []).map((interest) => ({
    url: `${baseUrl}/members/interest/${encodeURIComponent(interest.name)}`,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...profilePages,
    ...albumPages,
    ...photoPages,
    ...eventPages,
    ...challengePages,
    ...scenePages,
    ...galleryTagPages,
    ...memberTagPages,
    ...interestPages,
  ];
}
