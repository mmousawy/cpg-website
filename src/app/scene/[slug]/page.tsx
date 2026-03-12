import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import SceneActionsPopover from '@/components/scene/SceneActionsPopover';
import { SceneCategoryIcon } from '@/components/scene/SceneCategoryIcon';
import SceneCoverImage from '@/components/scene/SceneCoverImage';
import ArrowLink from '@/components/shared/ArrowLink';
import AuthorRow from '@/components/shared/AuthorRow';
import { routes } from '@/config/routes';
import {
  getAllSceneEventSlugs,
  getRelatedSceneEvents,
  getSceneEventBySlug,
  getSceneEventInterests,
  type SceneEventWithSubmitter,
} from '@/lib/data/scene';
import {
  getSceneCategoryStyle,
  SCENE_EVENT_CATEGORIES,
  type SceneEventCategory,
} from '@/types/scene';
import { formatPrice } from '@/utils/formatPrice';
import { createMetadata } from '@/utils/metadata';

import { RichDescription } from '@/components/shared/RichDescription';

import HeroCalendarSVG from 'public/icons/hero-calendar.svg';
import HeroCommunitiesSVG from 'public/icons/hero-communities.svg';
import HeroMapPinSVG from 'public/icons/hero-map-pin.svg';
import LinkSVG from 'public/icons/link.svg';
import TicketSVG from 'public/icons/ticket.svg';

import ClockSolidMiniSVG from 'public/icons/clock-solid-mini.svg';

import RelatedEventsSlider from '@/components/scene/RelatedEventsSlider';
import SceneEventComments from '@/components/scene/SceneEventComments';
import SceneEventStickyBar from '@/components/scene/SceneEventStickyBar';

export async function generateStaticParams() {
  const slugs = await getAllSceneEventSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug) {
    return createMetadata({ title: 'Event not found', description: '' });
  }

  const { event } = await getSceneEventBySlug(slug);
  if (!event) {
    return createMetadata({ title: 'Event not found', description: '' });
  }

  return createMetadata({
    title: event.title,
    description:
      event.description ||
      `${event.title} - ${event.location_name}, ${event.location_city}`,
    image: event.cover_image_url,
    canonical: `/scene/${slug}`,
    type: 'article',
  });
}

function formatDate(dateStr: string, currentYear: number, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(dateStr);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long', ...opts });
  const month = d.toLocaleDateString('en-US', { month: 'long', ...opts });
  return d.getFullYear() === currentYear
    ? `${weekday} ${month} ${d.getDate()}`
    : `${weekday} ${month} ${d.getDate()} ${d.getFullYear()}`;
}

function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  return time.toString().substring(0, 5);
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** Returns a human-readable date range string (no time). */
function formatDateRange(
  startDate: string,
  endDate: string | null,
  currentYear: number,
): string {
  const startD = new Date(startDate);
  const hasEndDate = endDate && endDate !== startDate;

  if (!hasEndDate) {
    return formatDate(startDate, currentYear);
  }

  const endD = new Date(endDate);
  const weekday = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'long' });
  const sameMonth =
    startD.getMonth() === endD.getMonth() &&
    startD.getFullYear() === endD.getFullYear();
  const sameYear = startD.getFullYear() === endD.getFullYear();

  const yearSuffix = (y: number) => y === currentYear ? '' : `, ${y}`;

  if (sameMonth) {
    return `${weekday(startD)} ${monthName(startD)} ${startD.getDate()} – ${weekday(endD)} ${ordinal(endD.getDate())}${yearSuffix(endD.getFullYear())}`;
  }

  if (sameYear) {
    return `${weekday(startD)} ${monthName(startD)} ${ordinal(startD.getDate())} – ${weekday(endD)} ${monthName(endD)} ${ordinal(endD.getDate())}${yearSuffix(endD.getFullYear())}`;
  }

  return `${weekday(startD)} ${monthName(startD)} ${ordinal(startD.getDate())}, ${startD.getFullYear()} – ${weekday(endD)} ${monthName(endD)} ${ordinal(endD.getDate())}, ${endD.getFullYear()}`;
}

/** Returns a human-readable time range string, or null if no time. */
function formatTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): string | null {
  const startTimeStr = formatTime(startTime);
  const endTimeStr = formatTime(endTime);
  const hasEndTime = !!endTimeStr && endTimeStr !== startTimeStr;

  if (!startTimeStr) return null;
  return hasEndTime ? `${startTimeStr} – ${endTimeStr}` : startTimeStr;
}

function getCategoryLabel(category: string): string {
  return (
    SCENE_EVENT_CATEGORIES.find((c) => c.value === category)?.label ?? category
  );
}

export default async function SceneEventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  if (!slug) notFound();

  const { event } = await getSceneEventBySlug(slug);
  if (!event) notFound();

  const related = await getRelatedSceneEvents(
    event.id,
    event.location_city,
    event.category,
    4,
  );

  const relatedIds = related.map((r) => r.id);
  const relatedInterests = relatedIds.length > 0
    ? await getSceneEventInterests(relatedIds)
    : {};

  const currentYear = new Date().getFullYear();
  const dateStr = formatDateRange(event.start_date, event.end_date, currentYear);
  const timeStr = formatTimeRange(
    event.start_time,
    (event as { end_time?: string | null }).end_time,
  );
  const categoryLabel = getCategoryLabel(event.category);
  const submitter = (event as SceneEventWithSubmitter).submitter;

  return (
    <>
      <PageContainer>
        <ArrowLink
          href={routes.scene.url}
          direction="left"
          className="mb-4"
        >
          Back to all events
        </ArrowLink>

        {/* Header: badge, title, actions */}
        <div
          className="mb-6"
        >
          <div
            className="flex items-center justify-between mb-2"
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full border pl-1 pr-2.5 py-1 text-xs font-medium"
              style={getSceneCategoryStyle(event.category as SceneEventCategory)}
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/20 [&_svg]:size-5"
              >
                <SceneCategoryIcon
                  category={event.category}
                  className="size-5 fill-current"
                />
              </span>
              {categoryLabel}
            </span>
            <SceneActionsPopover
              event={event}
            />
          </div>
          <h1
            className="text-2xl font-bold sm:text-3xl"
          >
            {event.title}
          </h1>
        </div>

        {/* Main card: event details, cover image, description, organizer, etc. */}
        <Container>
          <div
            className="overflow-hidden"
          >
            {event.cover_image_url && (
              <SceneCoverImage
                url={event.cover_image_url}
                title={event.title}
                imageWidth={event.image_width}
                imageHeight={event.image_height}
              />
            )}

            {/* Event Info - each item on its own row (wraps around floated image) */}
            <div
              className="mb-8 space-y-3"
            >
              <div
                className="flex items-start gap-2 text-[15px] font-semibold"
              >
                <HeroCalendarSVG
                  className="size-5 shrink-0 fill-foreground mt-0.5"
                />
                {dateStr}
              </div>
              {timeStr && (
                <div
                  className="flex items-start gap-2 text-[15px] font-semibold"
                >
                  <ClockSolidMiniSVG
                    className="size-5 shrink-0 fill-foreground mt-0.4"
                  />
                  {timeStr}
                </div>
              )}
              <div
                className="flex items-start gap-2 text-[15px] font-semibold"
              >
                <HeroMapPinSVG
                  className="size-5 shrink-0 fill-foreground mt-0.5"
                />
                <div>
                  <p>
                    {event.location_name}
                  </p>
                  <p
                    className="text-foreground/70 font-normal"
                  >
                    {event.location_address
                      ? `${event.location_address} · ${event.location_city}`
                      : event.location_city}
                  </p>
                </div>
              </div>
              <div
                className="flex items-start gap-2 text-[15px] font-semibold"
              >
                <TicketSVG
                  className="size-5 shrink-0 fill-foreground mt-0.5"
                />
                {formatPrice(event.price_info) ?? 'See event'}
              </div>
              {event.url && (
                <div
                  className="flex items-start gap-2 text-[15px] font-semibold"
                >
                  <LinkSVG
                    className="size-5 shrink-0 fill-foreground mt-0.5"
                  />
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline underline-offset-4 truncate"
                  >
                    {event.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  </a>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div
                className="mb-8"
              >
                <h2
                  className="text-lg font-semibold mb-3"
                >
                  About this event
                </h2>
                <RichDescription
                  html={event.description}
                  className="text-foreground/90 leading-snug max-w-[50ch]"
                />
              </div>
            )}

            {/* Organizer */}
            {event.organizer && (
              <p
                className="flex items-center gap-2 text-foreground/60"
              >
                <HeroCommunitiesSVG
                  className="size-5 shrink-0 fill-foreground/50"
                />
                Organized by
                {' '}
                <span
                  className="font-medium text-foreground/80"
                >
                  {event.organizer}
                </span>
              </p>
            )}

            {/* Submitted by */}
            {submitter?.nickname && (
              <div
                className="mt-8"
              >
                <h2
                  className="text-lg font-semibold mb-3"
                >
                  Added by
                </h2>
                <AuthorRow
                  profile={{
                    full_name: submitter.full_name,
                    nickname: submitter.nickname,
                    avatar_url: submitter.avatar_url,
                  }}
                />
              </div>
            )}
          </div>
        </Container>

        {related.length > 0 && (
          <RelatedEventsSlider
            events={related as Parameters<typeof RelatedEventsSlider>[0]['events']}
            interestedByEvent={relatedInterests}
            cityName={event.location_city}
          />
        )}
      </PageContainer>

      <SceneEventStickyBar
        event={event}
      />

      <PageContainer
        variant="alt"
        className="border-t border-t-border-color"
      >
        <div
          id="comments"
        >
          <SceneEventComments
            eventId={event.id}
          />
        </div>
      </PageContainer>
    </>
  );
}
