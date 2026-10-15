import {
  membersDailyDriverCameraPath,
  membersDailyDriverLensPath,
  membersShootingFormatPath,
} from '@/lib/gear/memberGearPaths';
import { SHOOTING_FORMAT_MICRO_ICONS } from '@/lib/gear/shootingFormatIcons';
import {
  hasDailyDriver,
  shootingFormatDisplayLabel,
  type UserGearProfile,
} from '@/lib/gear/types';
import Link from 'next/link';

import ArrowLink from '../shared/ArrowLink';

type ProfileGearSummaryProps = {
  profileNickname: string;
  profile: UserGearProfile;
  /** Hide on /@nickname/gear where the full list is already on the page. */
  showGearListLink?: boolean;
};

/** Gear highlights on public profile when the member has shared gear info. */
export default function ProfileGearSummary({
  profileNickname,
  profile,
  showGearListLink = true,
}: ProfileGearSummaryProps) {
  const hasFormats = profile.formats.length > 0;
  const hasDailyDriverInfo = hasDailyDriver(profile);
  const hasInventory = profile.items.length > 0;
  const hasPublicGear = hasFormats || hasDailyDriverInfo || (hasInventory && showGearListLink);
  const gearUrl = `/@${encodeURIComponent(profileNickname)}/gear`;

  const dailyDriverBody = profile.dailyDriverBody.trim();
  const dailyDriverLens = profile.dailyDriverLens.trim();

  if (!hasPublicGear) {
    return null;
  }

  return (
    <div
      className="mb-4 flex flex-col gap-2 text-sm sm:text-base leading-snug"
    >
      {hasFormats && (
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1"
        >
          <span
            className="text-foreground/70"
          >
            Shoots on:
          </span>
          <ul
            className="flex min-w-0 flex-wrap gap-x-2 gap-y-1 list-none"
          >
            {profile.formats.map((format) => {
              const FormatIcon = SHOOTING_FORMAT_MICRO_ICONS[format];
              return (
                <li
                  key={format}
                  className="inline-flex items-center gap-1.5"
                >
                  <FormatIcon
                    className="size-4 shrink-0 text-foreground/80"
                    aria-hidden
                  />
                  <Link
                    href={membersShootingFormatPath(format)}
                    className="hover:text-primary transition-colors"
                  >
                    {shootingFormatDisplayLabel(format, profile.formatsOther)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {hasDailyDriverInfo && (
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1"
        >
          <span
            className="text-foreground/70"
          >
            Daily driver:
          </span>
          <p
            className="min-w-0"
          >
            {dailyDriverBody.length > 0 && (
              <Link
                href={membersDailyDriverCameraPath(dailyDriverBody)}
                className="hover:text-primary transition-colors"
              >
                {dailyDriverBody}
              </Link>
            )}
            {dailyDriverBody.length > 0 && dailyDriverLens.length > 0 && (
              <span
                className="text-foreground/50"
                aria-hidden
              >
                {' '}
                +
                {' '}
              </span>
            )}
            {dailyDriverLens.length > 0 && (
              <Link
                href={membersDailyDriverLensPath(dailyDriverLens)}
                className="hover:text-primary transition-colors"
              >
                {dailyDriverLens}
              </Link>
            )}
          </p>
        </div>
      )}

      {showGearListLink && hasInventory && (
        <ArrowLink
          href={gearUrl}
          direction="right"
        >
          View full gear list
        </ArrowLink>
      )}
    </div>
  );
}
