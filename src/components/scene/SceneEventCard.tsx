import type { SceneEventInterested } from '@/lib/data/scene';
import type { SceneEvent, SceneEventCategory } from '@/types/scene';
import { SCENE_EVENT_CATEGORIES, getSceneCategoryStyle } from '@/types/scene';
import { formatPrice } from '@/utils/formatPrice';
import clsx from 'clsx';
import Link from 'next/link';

import { SceneCategoryIcon } from '@/components/scene/SceneCategoryIcon';
import BlurImage from '@/components/shared/BlurImage';
import StackedAvatarsPopover, { type AvatarPerson } from '@/components/shared/StackedAvatarsPopover';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';

type SceneEventCardProps = {
  event: SceneEvent;
  /** Interested users (for overview list) */
  interested?: SceneEventInterested[];
  className?: string;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const isCurrentYear = d.getFullYear() === new Date().getFullYear();
  return isCurrentYear
    ? `${weekday} ${month} ${d.getDate()}`
    : `${weekday} ${month} ${d.getDate()} ${d.getFullYear()}`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** Returns date range only (no time) for event cards. */
function formatDateRange(
  startDate: string,
  endDate: string | null,
): string {
  const startD = new Date(startDate);
  const hasEndDate = endDate && endDate !== startDate;

  if (!hasEndDate) {
    return formatDate(startDate);
  }

  const endD = new Date(endDate);
  const weekday = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = (d: Date, short = false) =>
    d.toLocaleDateString('en-US', { month: short ? 'short' : 'long' });
  const sameMonth =
    startD.getMonth() === endD.getMonth() &&
    startD.getFullYear() === endD.getFullYear();
  const sameYear = startD.getFullYear() === endD.getFullYear();

  const currentYear = new Date().getFullYear();
  const yearSuffix = (y: number) => y === currentYear ? '' : `, ${y}`;

  if (sameMonth) {
    return `${weekday(startD)} ${monthName(startD, true)} ${startD.getDate()} – ${weekday(endD)} ${ordinal(endD.getDate())}${yearSuffix(endD.getFullYear())}`;
  }

  if (sameYear) {
    return `${weekday(startD)} ${monthName(startD, true)} ${ordinal(startD.getDate())} – ${weekday(endD)} ${monthName(endD, true)} ${ordinal(endD.getDate())}${yearSuffix(endD.getFullYear())}`;
  }

  return `${weekday(startD)} ${monthName(startD, true)} ${ordinal(startD.getDate())}, ${startD.getFullYear()} – ${weekday(endD)} ${monthName(endD, true)} ${ordinal(endD.getDate())}, ${endD.getFullYear()}`;
}

function formatLocation(locationName: string | null, locationCity: string): string {
  if (locationName?.trim()) {
    return `${locationName.trim()}, ${locationCity}`;
  }
  return locationCity;
}

function getCategoryLabel(category: string): string {
  return (
    SCENE_EVENT_CATEGORIES.find((c) => c.value === category)?.label ?? category
  );
}

function transformInterestedToAvatarPeople(
  interested: SceneEventInterested[],
): AvatarPerson[] {
  return interested.map((i) => ({
    id: i.user_id,
    avatarUrl: i.profile?.avatar_url ?? null,
    fullName: i.profile?.full_name ?? null,
    nickname: i.profile?.nickname ?? null,
  }));
}

export default function SceneEventCard({
  event,
  interested = [],
  className,
}: SceneEventCardProps) {
  const imageSrc = event.cover_image_url;
  const dateStr = formatDateRange(event.start_date, event.end_date);
  const categoryLabel = getCategoryLabel(event.category);
  const locationStr = formatLocation(event.location_name, event.location_city);
  const interestedPeople = transformInterestedToAvatarPeople(interested);

  return (
    <Link
      href={`/scene/${event.slug}`}
      className={clsx(
        'block rounded-xl border border-border-color bg-background-light p-3 sm:p-5 transition-colors hover:border-primary group',
        className,
      )}
    >
      <div
        className="sm:flex sm:items-start sm:gap-4"
      >
        {/* Mobile: floating thumbnail on right, 72px tall, width scales to aspect ratio */}
        {imageSrc && (() => {
          const w = event.image_width ?? 400;
          const h = event.image_height ?? 300;
          const displayWidth = Math.round((w / h) * 72);
          return (
            <div
              className="sm:hidden float-right ml-2 mb-1 relative overflow-hidden rounded-lg bg-background-medium border border-border-color"
              style={{ width: Math.min(displayWidth, 72), height: 72 }}
            >
              <BlurImage
                src={imageSrc}
                alt={event.title}
                fill
                sizes={`${Math.min(displayWidth, 64)}px`}
                className="object-contain"
                blurhash={event.image_blurhash}
                noBlur={/\.png(\?|$)/i.test(imageSrc)}
              />
            </div>
          );
        })()}

        {/* Content */}
        <div
          className="sm:flex-1 sm:min-w-0"
        >
          <div
            className="flex flex-wrap items-center gap-1.5 mb-1.5"
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full border pl-1 pr-2.5 py-1 text-xs font-medium"
              style={getSceneCategoryStyle(event.category as SceneEventCategory)}
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/20 [&_svg]:size-3.5"
              >
                <SceneCategoryIcon
                  category={event.category}
                  className="size-3.5 fill-current"
                />
              </span>
              {categoryLabel}
            </span>
            <span
              className="text-foreground/40"
              aria-hidden
            >
              ·
            </span>
            <span
              className="text-xs font-medium text-foreground/80"
            >
              {formatPrice(event.price_info) ?? 'Free'}
            </span>
          </div>
          <h3
            className="font-semibold group-hover:text-primary transition-colors leading-tight line-clamp-2 mb-1.5"
          >
            {event.title}
          </h3>
          <div
            className="space-y-1 text-sm text-foreground/90"
          >
            <span
              className="flex items-start gap-1"
            >
              <CalendarSVG
                className="size-3.5 fill-foreground/70 shrink-0 mt-[3px]"
              />
              {dateStr}
            </span>
            <span
              className="flex items-start gap-1"
            >
              <LocationSVG
                className="size-3.5 fill-foreground/70 shrink-0 mt-[3px]"
              />
              <span
                className="line-clamp-1"
              >
                {locationStr}
              </span>
            </span>
          </div>
          {interested.length > 0 && (
            <div
              className="mt-2"
            >
              <StackedAvatarsPopover
                people={interestedPeople}
                singularLabel="interested"
                pluralLabel="interested"
                emptyMessage="No one interested yet"
                showInlineCount={true}
                avatarSize="xxs"
                disableLinks
              />
            </div>
          )}
        </div>

        {/* Desktop: thumbnail on right, 96px tall, width scales to aspect ratio */}
        {imageSrc && (() => {
          const w = event.image_width ?? 400;
          const h = event.image_height ?? 300;
          const displayWidth = Math.round((w / h) * 96);
          return (
            <div
              className="hidden bg-white sm:block shrink-0 relative overflow-hidden rounded-lg bg-background-medium border border-border-color"
              style={{ width: displayWidth, height: 96 }}
            >
              <BlurImage
                src={imageSrc}
                alt={event.title}
                fill
                sizes={`${displayWidth}px`}
                className="object-contain"
                blurhash={event.image_blurhash}
                noBlur={/\.png(\?|$)/i.test(imageSrc)}
              />
            </div>
          );
        })()}
      </div>
    </Link>
  );
}
