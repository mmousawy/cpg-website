import type { SceneEventInterested } from '@/lib/data/scene';
import type { SceneEvent, SceneEventCategory } from '@/types/scene';
import { SCENE_EVENT_CATEGORIES, getSceneCategoryStyle } from '@/types/scene';
import { formatPrice } from '@/utils/formatPrice';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';

import SceneCardInterestRow from '@/components/scene/SceneCardInterestRow';
import { SceneCategoryIcon } from '@/components/scene/SceneCategoryIcon';
import BlurImage from '@/components/shared/BlurImage';
import type { AvatarPerson } from '@/components/shared/StackedAvatarsPopover';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import TicketCardSVG from 'public/icons/ticket-card.svg';

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
  const isCpgEvent = event.id.startsWith('cpg-');
  const interestCount = event.interest_count ?? 0;
  const showInterestRow = interested.length > 0;
  const href = isCpgEvent
    ? `/events/${event.slug}`
    : `/scene/${event.slug}`;

  return (
    <div
      className={clsx(
        'rounded-xl border border-border-color bg-background-light transition-colors hover:border-primary group',
        className,
      )}
    >
      <Link
        href={href}
        className="block p-3 sm:p-5 transition-colors"
      >
        <div
          className="flex items-start gap-4"
        >
          <div
            className={`shrink-0 relative overflow-hidden rounded-lg border border-border-color size-18 sm:size-27.5 flex items-center justify-center${imageSrc ? '' : ' bg-white'}`}
          >
            {imageSrc ? (
              <BlurImage
                src={imageSrc}
                alt={event.title}
                fill
                sizes="(max-width: 640px) 72px, 110px"
                className={`object-contain${/\.png(\?|$)/i.test(imageSrc) ? ' bg-white' : ''}`}
                blurhash={event.image_blurhash}
                noBlur={/\.png(\?|$)/i.test(imageSrc)}
              />
            ) : (
              <Image
                src="/cpg-placeholder.png"
                alt=""
                fill
                sizes="(max-width: 640px) 72px, 110px"
                className="object-contain bg-white"
                aria-hidden
              />
            )}
          </div>
          <div
            className="flex-1 min-w-0"
          >
            <div
              className="flex flex-wrap items-center gap-1.5 mb-1.5"
            >
              <span
                className="inline-flex items-center gap-1.5 rounded-full border pl-1 pr-2.5 py-1 text-xs font-medium"
                style={getSceneCategoryStyle(event.category as SceneEventCategory)}
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/40 [&_svg]:size-4"
                >
                  <SceneCategoryIcon
                    category={event.category}
                    className="size-4 fill-current"
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
                className="flex items-center gap-1 text-xs font-medium text-foreground/80"
              >
                <TicketCardSVG
                  className="size-4 shrink-0 fill-foreground/70"
                />
                {formatPrice(event.price_info) ?? 'See event'}
              </span>
            </div>
            <p
              className="font-semibold group-hover:text-primary transition-colors leading-tight line-clamp-2 mb-1.5"
            >
              {event.title}
            </p>
            <div
              className="space-y-1 text-sm text-foreground/90"
            >
              <span
                className="flex items-start gap-1"
              >
                <CalendarSVG
                  className="size-4 fill-foreground/70 shrink-0 mt-0.75"
                />
                {dateStr}
              </span>
              <span
                className="flex items-start gap-1"
              >
                <LocationSVG
                  className="size-4 fill-foreground/70 shrink-0 mt-0.75"
                />
                <span
                  className="line-clamp-1"
                >
                  {locationStr}
                </span>
              </span>
            </div>
          </div>
        </div>
      </Link>
      {showInterestRow && (
        <div
          className="border-t border-border-color px-3 py-2.5 sm:px-5 sm:py-4"
        >
          <SceneCardInterestRow
            people={interestedPeople}
            interestCount={interestCount}
          />
        </div>
      )}
    </div>
  );
}
