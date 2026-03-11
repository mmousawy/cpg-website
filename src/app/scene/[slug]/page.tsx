import { connection } from 'next/server';
import { notFound } from 'next/navigation';

import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import SceneActionsPopover from '@/components/scene/SceneActionsPopover';
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
import { SCENE_EVENT_CATEGORIES } from '@/types/scene';
import { formatPrice } from '@/utils/formatPrice';
import { createMetadata } from '@/utils/metadata';

import { RichDescription } from '@/components/shared/RichDescription';

import HeroCalendarSVG from 'public/icons/hero-calendar.svg';
import HeroCommunitiesSVG from 'public/icons/hero-communities.svg';
import HeroCurrencySVG from 'public/icons/hero-currency.svg';
import HeroGlobeSVG from 'public/icons/hero-globe.svg';
import HeroMapPinSVG from 'public/icons/hero-map-pin.svg';

import SceneEventCard from '@/components/scene/SceneEventCard';
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

/** Returns a single human-readable date/time string. */
function formatDateTimeRange(
  startDate: string,
  endDate: string | null,
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  currentYear: number,
): string {
  const startD = new Date(startDate);
  const startTimeStr = formatTime(startTime);
  const endTimeStr = formatTime(endTime);
  const hasEndTime = !!endTimeStr && endTimeStr !== startTimeStr;
  const hasEndDate = endDate && endDate !== startDate;

  const timeStr = startTimeStr
    ? hasEndTime
      ? ` · ${startTimeStr} – ${endTimeStr}`
      : ` · ${startTimeStr}`
    : '';

  if (!hasEndDate) {
    return `${formatDate(startDate, currentYear)}${timeStr}`;
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
    return `${weekday(startD)} ${monthName(startD)} ${startD.getDate()} – ${weekday(endD)} ${ordinal(endD.getDate())}${yearSuffix(endD.getFullYear())}${timeStr}`;
  }

  if (sameYear) {
    return `${weekday(startD)} ${monthName(startD)} ${ordinal(startD.getDate())} – ${weekday(endD)} ${monthName(endD)} ${ordinal(endD.getDate())}${yearSuffix(endD.getFullYear())}${timeStr}`;
  }

  return `${weekday(startD)} ${monthName(startD)} ${ordinal(startD.getDate())}, ${startD.getFullYear()} – ${weekday(endD)} ${monthName(endD)} ${ordinal(endD.getDate())}, ${endD.getFullYear()}${timeStr}`;
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
  const dateTimeStr = formatDateTimeRange(
    event.start_date,
    event.end_date,
    event.start_time,
    (event as { end_time?: string | null }).end_time,
    currentYear,
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
          Back to Scene
        </ArrowLink>

        {/* Header: badge, title, actions */}
        <div
          className="mb-6"
        >
          <div
            className="flex items-center justify-between mb-2"
          >
            <span
              className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
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
                blurhash={event.image_blurhash}
              />
            )}

            {/* Event Info - each item on its own row (wraps around floated image) */}
            <div
              className="mb-8 space-y-3"
            >
              <div
                className="flex items-center gap-2 text-[15px] font-semibold"
              >
                <HeroCalendarSVG
                  className="size-5 shrink-0 fill-foreground"
                />
                {dateTimeStr}
              </div>
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
                    {event.location_city}
                    {event.location_address && ` · ${event.location_address}`}
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-2 text-[15px] font-semibold"
              >
                <HeroCurrencySVG
                  className="size-5 shrink-0 fill-foreground"
                />
                {formatPrice(event.price_info) ?? 'Free'}
              </div>
              {event.url && (
                <div
                  className="flex items-center gap-2 text-[15px] font-semibold"
                >
                  <HeroGlobeSVG
                    className="size-5 shrink-0 fill-foreground"
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
                className="flex items-center gap-2 text-foreground/60 mb-8"
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
              <div>
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

        {/* Related events - outside card */}
        {related.length > 0 && (
          <section
            className="mt-8"
          >
            <h2
              className="text-lg font-semibold mb-4 opacity-70"
            >
              More events in
              {' '}
              {event.location_city}
            </h2>
            <div
              className="grid gap-4 sm:gap-6"
            >
              {related.map((rel) => (
                <SceneEventCard
                  key={rel.id}
                  event={rel as Parameters<typeof SceneEventCard>[0]['event']}
                  interested={relatedInterests[rel.id] || []}
                />
              ))}
            </div>
          </section>
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
