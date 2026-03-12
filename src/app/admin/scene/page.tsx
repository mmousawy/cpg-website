'use client';

import Image from 'next/image';
import Link from 'next/link';

import BlurImage from '@/components/shared/BlurImage';
import { useState } from 'react';

import PageContainer from '@/components/layout/PageContainer';
import { SceneCategoryIcon } from '@/components/scene/SceneCategoryIcon';
import Button from '@/components/shared/Button';
import { useDeleteSceneEvent } from '@/hooks/useSceneEvents';
import { useSupabase } from '@/hooks/useSupabase';
import {
  getSceneCategoryStyle,
  SCENE_EVENT_CATEGORIES,
  type SceneEvent,
  type SceneEventCategory,
} from '@/types/scene';
import { formatPrice } from '@/utils/formatPrice';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import SadSVG from 'public/icons/sad.svg';
import TicketCardSVG from 'public/icons/ticket-card.svg';
import TimeSVG from 'public/icons/time.svg';
import TrashSVG from 'public/icons/trash.svg';

function formatDateRange(
  startDate: string,
  endDate: string | null,
): string {
  const currentYear = new Date().getFullYear();
  const start = new Date(startDate);
  const startIsCurrentYear = start.getFullYear() === currentYear;
  const startStr = startIsCurrentYear
    ? `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()}`
    : `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} ${start.getFullYear()}`;
  if (!endDate || endDate === startDate) return startStr;
  const end = new Date(endDate);
  const endIsCurrentYear = end.getFullYear() === currentYear;
  const sameYear = start.getFullYear() === end.getFullYear();
  const startWithDay = start.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: sameYear && startIsCurrentYear ? undefined : 'numeric',
  });
  const endWithDay = end.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: endIsCurrentYear ? undefined : 'numeric',
  });
  return `${startWithDay} – ${endWithDay}`;
}

function formatTime(time: string | null): string {
  if (!time) return '';
  return time.toString().substring(0, 5);
}

function formatTimeRange(startTime: string | null, endTime: string | null | undefined): string {
  const start = formatTime(startTime);
  if (!start) return '';
  if (!endTime) return start;
  const end = formatTime(endTime);
  if (start === end) return start;
  return `${start} – ${end}`;
}

function getCategoryLabel(category: string): string {
  return (
    SCENE_EVENT_CATEGORIES.find((c) => c.value === category)?.label ?? category
  );
}

export default function AdminScenePage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteSceneEvent();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['admin-scene-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('scene_events')
        .select(
          'id, slug, title, description, category, start_date, end_date, start_time, end_time, location_name, location_city, location_address, url, cover_image_url, image_blurhash, image_width, image_height, organizer, price_info, submitted_by, created_at',
        )
        .is('deleted_at', null)
        .order('start_date', { ascending: false });

      return (data || []) as SceneEvent[];
    },
  });

  const handleDelete = async (eventId: string) => {
    if (!confirm('Delete this event? It will be removed from the public list.'))
      return;
    await deleteMutation.mutateAsync(eventId);
    queryClient.setQueryData<SceneEvent[]>(
      ['admin-scene-events'],
      (old) => old?.filter((e) => e.id !== eventId) ?? [],
    );
  };

  const filtered = events.filter((e) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !e.title?.toLowerCase().includes(q) &&
        !e.description?.toLowerCase().includes(q) &&
        !e.location_name?.toLowerCase().includes(q) &&
        !e.organizer?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (cityFilter.trim()) {
      if (!e.location_city?.toLowerCase().includes(cityFilter.toLowerCase()))
        return false;
    }
    return true;
  });

  const cities = Array.from(
    new Set(events.map((e) => e.location_city).filter(Boolean)),
  ).sort() as string[];

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <h1
          className="text-2xl sm:text-3xl font-bold"
        >
          Scene events
        </h1>
        <p
          className="text-base sm:text-lg mt-2 text-foreground/70"
        >
          Browse and manage community-submitted photography events
        </p>
      </div>

      {/* Search & filters */}
      <div
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
      >
        <input
          type="search"
          placeholder="Search by title, description, venue, organizer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm sm:w-64"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm"
        >
          <option
            value="all"
          >
            All categories
          </option>
          {SCENE_EVENT_CATEGORIES.map((c) => (
            <option
              key={c.value}
              value={c.value}
            >
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm"
        >
          <option
            value=""
          >
            All cities
          </option>
          {cities.map((city) => (
            <option
              key={city}
              value={city}
            >
              {city}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div
          className="text-center animate-pulse py-12"
        >
          <p
            className="text-foreground/50"
          >
            Loading events...
          </p>
        </div>
      ) : events.length === 0 ? (
        <div
          className="text-center py-12"
        >
          <SadSVG
            className="mb-4 inline-block h-12 w-12 fill-foreground/50"
          />
          <p
            className="mb-4 text-foreground/80"
          >
            No scene events yet
          </p>
          <Link
            href="/scene"
          >
            <Button>
              View Scene page
            </Button>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-12"
        >
          <p
            className="text-foreground/70"
          >
            No events match your filters
          </p>
        </div>
      ) : (
        <div
          className="space-y-3"
        >
          {filtered.map((event) => (
            <AdminSceneEventCard
              key={event.id}
              event={event}
              onDelete={() => handleDelete(event.id)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function AdminSceneEventCard({
  event,
  onDelete,
  isDeleting,
}: {
  event: SceneEvent;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const imageSrc = event.cover_image_url;
  const dateStr = formatDateRange(event.start_date, event.end_date);
  const timeStr = formatTimeRange(event.start_time, event.end_time);
  const categoryLabel = getCategoryLabel(event.category);

  return (
    <div
      className="block rounded-xl border border-border-color bg-background-light p-3 sm:p-4"
    >
      <div
        className="flex items-start gap-3 sm:gap-4"
      >
        <Link
          href={`/scene/${event.slug}`}
          className="flex-1 min-w-0"
        >
          <div
            className="flex items-start gap-3 sm:gap-4"
          >
            <div
              className={`shrink-0 relative overflow-hidden rounded-lg border border-border-color size-[72px] sm:size-[110px] flex items-center justify-center${imageSrc ? '' : ' bg-white'}`}
            >
              {imageSrc ? (
                <BlurImage
                  src={imageSrc}
                  alt={event.title ?? 'Event cover'}
                  fill
                  sizes="(max-width: 640px) 72px, 110px"
                  className="object-contain"
                  blurhash={event.image_blurhash}
                  noBlur={/\.png(\?|$)/i.test(imageSrc)}
                />
              ) : (
                <Image
                  src="/cpg-placeholder.png"
                  alt=""
                  fill
                  sizes="(max-width: 640px) 72px, 110px"
                  className="object-contain p-2"
                  aria-hidden
                />
              )}
            </div>
            <div
              className="flex-1 min-w-0"
            >
              <div
                className="flex flex-wrap gap-2 mb-1"
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border pl-1 pr-2.5 py-1 text-xs font-medium"
                  style={getSceneCategoryStyle(event.category as SceneEventCategory)}
                >
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/20 [&_svg]:size-4"
                  >
                    <SceneCategoryIcon
                      category={event.category}
                      className="size-4 fill-current"
                    />
                  </span>
                  {categoryLabel}
                </span>
                {formatPrice(event.price_info) && (
                  <span
                    className="flex items-center gap-1 text-xs text-foreground/60"
                  >
                    <TicketCardSVG
                      className="size-3.5 shrink-0 fill-foreground/60"
                    />
                    {formatPrice(event.price_info)}
                  </span>
                )}
              </div>
              <h4
                className="font-semibold line-clamp-2 group-hover:text-primary transition-colors"
              >
                {event.title}
              </h4>
              <div
                className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground/70 mt-1"
              >
                <span
                  className="flex items-center gap-1"
                >
                  <CalendarSVG
                    className="size-3.5 fill-foreground/60"
                  />
                  {dateStr}
                </span>
                {timeStr && (
                  <span
                    className="flex items-center gap-1"
                  >
                    <TimeSVG
                      className="size-3.5 fill-foreground/60"
                    />
                    {timeStr}
                  </span>
                )}
                <span
                  className="flex items-center gap-1"
                >
                  <LocationSVG
                    className="size-3.5 fill-foreground/60"
                  />
                  <span
                    className="line-clamp-1"
                  >
                    {event.location_city}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </Link>
        <div
          className="shrink-0 flex items-center"
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            disabled={isDeleting}
            className="rounded-full border border-border-color-strong bg-background px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:border-red-500 hover:bg-red-50 flex items-center gap-1.5 disabled:opacity-50"
          >
            <TrashSVG
              className="size-4 fill-current"
            />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
