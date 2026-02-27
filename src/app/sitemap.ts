import { MetadataRoute } from 'next';
import { createPublicClient } from '@/utils/supabase/server';
import { getAllProfileNicknames } from '@/lib/data/profiles';
import { getAllAlbumPaths } from '@/lib/data/albums';
import { getAllTagNames } from '@/lib/data/gallery';
import { getAllEventSlugs } from '@/lib/data/events';
import type { Tables } from '@/database.types';

const baseUrl = 'https://creativephotography.group';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/challenges`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gallery/photos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/gallery/albums`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/members`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Profile pages - getAllProfileNicknames returns '@nickname' format
  const nicknames = await getAllProfileNicknames();
  const profilePages: MetadataRoute.Sitemap = nicknames.map((nickname) => ({
    url: `${baseUrl}/${nickname}`, // nickname includes @ prefix, need / before path
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Album pages
  const albumPaths = await getAllAlbumPaths();
  const albumPages: MetadataRoute.Sitemap = albumPaths.map(({ nickname, albumSlug }) => ({
    url: `${baseUrl}/${nickname}/album/${albumSlug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Photo pages - fetch public photos with short_id
  const { data: photos } = await supabase
    .from('photos')
    .select('short_id, user_id, created_at, profiles!photos_user_id_fkey(nickname)')
    .eq('is_public', true)
    .is('deleted_at', null)
    .not('short_id', 'is', null);

  type PhotoRow = Pick<Tables<'photos'>, 'short_id' | 'user_id' | 'created_at'>;
  type ProfileRow = Pick<Tables<'profiles'>, 'nickname'>;
  type PhotoQueryResult = PhotoRow & {
    profiles: Array<ProfileRow> | null;
  };

  const photoPages: MetadataRoute.Sitemap = (photos || [])
    .filter((photo: PhotoQueryResult) => {
      const profile = Array.isArray(photo.profiles) ? photo.profiles[0] : photo.profiles;
      return !!profile?.nickname;
    })
    .map((photo: PhotoQueryResult) => {
      const profile = Array.isArray(photo.profiles) ? photo.profiles[0] : photo.profiles;
      return {
        url: `${baseUrl}/${profile!.nickname}/photo/${photo.short_id}`,
        lastModified: photo.created_at ? new Date(photo.created_at) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      };
    });

  // Event pages
  const eventSlugs = await getAllEventSlugs();
  const eventPages: MetadataRoute.Sitemap = eventSlugs.map((slug) => ({
    url: `${baseUrl}/events/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Tag pages
  const tagNames = await getAllTagNames();
  const tagPages: MetadataRoute.Sitemap = tagNames.flatMap((tagName) => [
    {
      url: `${baseUrl}/gallery/tag/${encodeURIComponent(tagName)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/members/tag/${encodeURIComponent(tagName)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ]);

  // Interest pages
  const { data: interests } = await supabase
    .from('interests')
    .select('name')
    .gt('count', 0);

  const interestPages: MetadataRoute.Sitemap = (interests || []).map((interest) => ({
    url: `${baseUrl}/members/interest/${encodeURIComponent(interest.name)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...profilePages,
    ...albumPages,
    ...photoPages,
    ...eventPages,
    ...tagPages,
    ...interestPages,
  ];
}
