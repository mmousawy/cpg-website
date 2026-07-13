import { getProfileByNickname } from '@/lib/data/profiles';
import { CHERIA_HEADING_FONT_NAME, loadOgFonts } from '@/lib/og/loadOgFonts';
import { getSocialImageUrl } from '@/utils/metadata';
import { getProfileBannerColors } from '@/utils/profileBannerColor';
import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';
export const revalidate = 3600;

export const alt = 'Profile preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const AVATAR_SIZE = 180;
const AVATAR_BORDER = 3;
const AVATAR_INNER_SIZE = AVATAR_SIZE - AVATAR_BORDER * 2;
const AVATAR_RADIUS = AVATAR_SIZE / 2;
const AVATAR_INNER_RADIUS = AVATAR_INNER_SIZE / 2;
const TITLE_FONT_SIZE = 78;
const NICKNAME_FONT_SIZE = 42;
const INITIALS_FONT_SIZE = 60;
const CONTENT_GAP = 36;
const CONTENT_INSET_X = 60;
const CONTENT_INSET_BOTTOM = 44;
const BORDER_COLOR = '#e0e3e7';
const TEXT_SHADOW = '0 3px 12px rgba(0, 0, 0, 0.5)';

const SCRIM_GRADIENT = [
  'linear-gradient(to top,',
  'rgba(0, 0, 0, 0.85) 0%,',
  'rgba(0, 0, 0, 0.65) 25%,',
  'rgba(0, 0, 0, 0.45) 40%,',
  'rgba(0, 0, 0, 0.25) 55%,',
  'rgba(0, 0, 0, 0.1) 75%,',
  'transparent 100%)',
].join(' ');

function getProfileDisplayTitle(fullName: string | null, nickname: string | null): string {
  if (fullName) {
    return fullName;
  }
  if (nickname) {
    return `@${nickname}`;
  }
  return 'Profile';
}

function getInitials(fullName: string | null, nickname: string | null): string {
  if (fullName) {
    const fromName = fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return fromName || nickname?.slice(0, 2).toUpperCase() || '?';
  }
  if (nickname) {
    return nickname.slice(0, 2).toUpperCase();
  }
  return '?';
}

export default async function Image({ params }: { params: Promise<{ nickname: string }> }) {
  const resolvedParams = await params;
  const rawNickname = decodeURIComponent(resolvedParams?.nickname || '');

  if (!rawNickname.startsWith('@')) {
    notFound();
  }

  const nickname = rawNickname.slice(1);
  if (!nickname) {
    notFound();
  }

  const profile = await getProfileByNickname(nickname);
  if (!profile) {
    notFound();
  }

  const [fonts, bannerUrl, avatarUrl] = await Promise.all([
    loadOgFonts(),
    profile.banner_url
      ? Promise.resolve(getSocialImageUrl(profile.banner_url, { width: OG_WIDTH, height: OG_HEIGHT }))
      : Promise.resolve(null),
    profile.avatar_url
      ? Promise.resolve(getSocialImageUrl(profile.avatar_url, {
        width: AVATAR_INNER_SIZE * 2,
        height: AVATAR_INNER_SIZE * 2,
      }))
      : Promise.resolve(null),
  ]);

  const bannerColors = profile.nickname ? getProfileBannerColors(profile.nickname) : null;
  const displayTitle = getProfileDisplayTitle(profile.full_name, profile.nickname);
  const showNickname = Boolean(profile.full_name && profile.nickname);
  const initials = getInitials(profile.full_name, profile.nickname);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: bannerColors?.dark ?? '#1a1a1a',
        }}
      >
        {bannerUrl ? (
          <img
            alt=""
            src={bannerUrl}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : bannerColors ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: bannerColors.dark,
            }}
          />
        ) : null}

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: SCRIM_GRADIENT,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: CONTENT_INSET_X,
            right: CONTENT_INSET_X,
            bottom: CONTENT_INSET_BOTTOM,
            display: 'flex',
            alignItems: 'center',
            gap: CONTENT_GAP,
          }}
        >
          <div
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: AVATAR_RADIUS,
              border: `${AVATAR_BORDER}px solid ${BORDER_COLOR}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: AVATAR_INNER_SIZE,
                height: AVATAR_INNER_SIZE,
                borderRadius: AVATAR_INNER_RADIUS,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: '#424447',
              }}
            >
              {avatarUrl ? (
                <svg
                  width={AVATAR_INNER_SIZE}
                  height={AVATAR_INNER_SIZE}
                  viewBox={`0 0 ${AVATAR_INNER_SIZE} ${AVATAR_INNER_SIZE}`}
                >
                  <defs>
                    <clipPath
                      id="profile-avatar-clip"
                    >
                      <circle
                        cx={AVATAR_INNER_RADIUS}
                        cy={AVATAR_INNER_RADIUS}
                        r={AVATAR_INNER_RADIUS}
                      />
                    </clipPath>
                  </defs>
                  <image
                    href={avatarUrl}
                    width={AVATAR_INNER_SIZE}
                    height={AVATAR_INNER_SIZE}
                    clipPath="url(#profile-avatar-clip)"
                    preserveAspectRatio="xMidYMid slice"
                  />
                </svg>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: AVATAR_INNER_SIZE,
                    height: AVATAR_INNER_SIZE,
                    fontSize: INITIALS_FONT_SIZE,
                    fontFamily: 'Geist',
                    fontWeight: 700,
                    color: '#ffffff',
                  }}
                >
                  {initials}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: TITLE_FONT_SIZE,
                fontFamily: CHERIA_HEADING_FONT_NAME,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.1,
                textShadow: TEXT_SHADOW,
              }}
            >
              {displayTitle}
            </div>
            {showNickname && (
              <div
                style={{
                  fontSize: NICKNAME_FONT_SIZE,
                  fontFamily: 'Geist',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.85)',
                  lineHeight: 1.2,
                  marginTop: 6,
                  textShadow: TEXT_SHADOW,
                }}
              >
                {`@${profile.nickname}`}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts,
    },
  );
}
