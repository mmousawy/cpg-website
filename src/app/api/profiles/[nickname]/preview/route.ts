import { NextRequest, NextResponse } from 'next/server';

import { getIncludeTestContentFromRequest } from '@/lib/auth/includeTestContent';
import { getUserPublicAlbumCount } from '@/lib/data/albums';
import { getProfileFollowCounts } from '@/lib/data/follows';
import { getUserGearByNickname } from '@/lib/data/gear';
import { getProfileByNickname, getUserPublicPhotoCount } from '@/lib/data/profiles';
import {
  hasDailyDriver,
  shootingFormatDisplayLabel,
  type UserGearProfile,
} from '@/lib/gear/types';
import { getPublishedProfileFields } from '@/lib/profileUrl/linkPublishState';

const PREVIEW_FORMAT_LIMIT = 2;

function normalizeNickname(rawNickname: string): string {
  return decodeURIComponent(rawNickname || '').trim().replace(/^@/, '').toLowerCase();
}

function formatGearLine(profile: UserGearProfile | null): string | null {
  if (!profile) return null;

  const formatLabels = profile.formats
    .slice(0, PREVIEW_FORMAT_LIMIT)
    .map((format) => shootingFormatDisplayLabel(format, profile.formatsOther));

  const body = profile.dailyDriverBody.trim();
  const lens = profile.dailyDriverLens.trim();
  const driver = [body, lens].filter(Boolean).join(' + ');

  const parts: string[] = [];
  if (formatLabels.length > 0) {
    parts.push(`Shoots on ${formatLabels.join(', ')}`);
  }
  if (hasDailyDriver(profile) && driver) {
    parts.push(driver);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ nickname: string }> },
) {
  const { nickname: rawNickname } = await context.params;
  const nickname = normalizeNickname(rawNickname);

  if (!nickname) {
    return NextResponse.json({ message: 'Nickname required' }, { status: 400 });
  }

  const includeTestContent = getIncludeTestContentFromRequest(request);
  const profile = await getProfileByNickname(nickname, includeTestContent);

  if (!profile?.nickname) {
    return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
  }

  const published = getPublishedProfileFields(profile);
  const [{ followerCount, followingCount }, photoCount, albumCount, gearProfile] = await Promise.all([
    getProfileFollowCounts(profile.id),
    getUserPublicPhotoCount(profile.id, profile.nickname),
    getUserPublicAlbumCount(profile.id, profile.nickname),
    getUserGearByNickname(profile.nickname, includeTestContent),
  ]);

  return NextResponse.json(
    {
      id: profile.id,
      nickname: profile.nickname,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      banner_url: profile.banner_url,
      banner_blurhash: profile.banner_blurhash ?? null,
      bio: published.bio,
      photoCount,
      albumCount,
      followerCount,
      followingCount,
      gearLine: formatGearLine(gearProfile),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    },
  );
}
