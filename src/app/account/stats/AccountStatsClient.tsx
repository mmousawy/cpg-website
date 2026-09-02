'use client';

import PageContainer from '@/components/layout/PageContainer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import StatsDonutChart from '@/components/stats/StatsDonutChart';
import StatsKpiGrid from '@/components/stats/StatsKpiGrid';
import StatsRangeTabs from '@/components/stats/StatsRangeTabs';
import StatsRankedList, { formatBytesRanked } from '@/components/stats/StatsRankedList';
import StatsSection from '@/components/stats/StatsSection';
import StatsTimeSeriesChart from '@/components/stats/StatsTimeSeriesChart';
import type { MemberStatsDetail, StatsRange, StatsTimeSeriesPoint } from '@/types/stats';
import { formatFileSize } from '@/utils/formatFileSize';
import { useCallback, useEffect, useState } from 'react';

type LifetimeStats = {
  albums: number;
  photos: number;
  commentsMade: number;
  commentsReceived: number;
  likesReceived: number;
  likesMade: number;
  viewsReceived: number;
  rsvpsConfirmed: number;
  rsvpsCanceled: number;
  eventsAttended: number;
  challengesParticipated: number;
  challengePhotosAccepted: number;
};

type SeriesEntry = { metric: string; points: StatsTimeSeriesPoint[] };

const METRIC_LABELS: Record<string, string> = {
  uploads: 'Photo uploads',
  views: 'Views received',
  likes: 'Likes received',
  storage_added: 'Total storage',
  followers_gained: 'New followers',
};

export default function AccountStatsClient() {
  const [range, setRange] = useState<StatsRange>('30d');
  const [lifetime, setLifetime] = useState<LifetimeStats | null>(null);
  const [detail, setDetail] = useState<MemberStatsDetail | null>(null);
  const [series, setSeries] = useState<SeriesEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/account/stats/analytics?range=${range}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLifetime(data.lifetime as LifetimeStats);
      setDetail(data.detail as MemberStatsDetail);
      setSeries(data.series ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading && !lifetime) {
    return (
      <PageContainer>
        <div
          className="flex justify-center py-20"
        >
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (!lifetime || !detail) {
    return (
      <PageContainer>
        <p>Failed to load your stats.</p>
      </PageContainer>
    );
  }

  const totalPhotos = detail.publicPhotoCount + detail.privatePhotoCount;
  const publicPct = totalPhotos
    ? Math.round((detail.publicPhotoCount / totalPhotos) * 100)
    : 0;

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <h1
          className="text-2xl sm:text-3xl font-bold font-heading"
        >
          My stats
        </h1>
        <p
          className="mt-2 text-base sm:text-lg text-foreground/80"
        >
          Views, likes, uploads, storage, and engagement on your content
        </p>
      </div>

      <div
        className="space-y-12"
      >
      <StatsKpiGrid
        items={[
          { label: 'Photos', value: lifetime.photos },
          { label: 'Albums', value: lifetime.albums },
          { label: 'Views received', value: lifetime.viewsReceived },
          { label: 'Likes received', value: lifetime.likesReceived },
          { label: 'Likes given', value: lifetime.likesMade },
          { label: 'Comments made', value: lifetime.commentsMade },
          { label: 'Comments received', value: lifetime.commentsReceived },
          { label: 'Storage used', value: detail.storageBytes, format: 'bytes' },
          { label: 'Followers', value: detail.followers },
          { label: 'Following', value: detail.following },
          { label: 'Events attended', value: lifetime.eventsAttended },
          { label: 'RSVPs', value: `${lifetime.rsvpsConfirmed} / ${lifetime.rsvpsCanceled} canceled`, format: 'text' },
          { label: 'Challenges', value: lifetime.challengesParticipated },
          { label: 'Photos accepted', value: lifetime.challengePhotosAccepted },
          { label: 'Public photos', value: `${publicPct}%`, format: 'text' },
          { label: 'Shared albums', value: detail.sharedAlbumsJoined },
        ]}
      />

      <StatsSection
        title="Activity over time"
        action={<StatsRangeTabs value={range} onChange={setRange} />}
        description="How your content performed in the selected period"
      >
        {isLoading ? (
          <div
            className="flex justify-center py-8"
          >
            <LoadingSpinner />
          </div>
        ) : (
          <div
            className="grid gap-8 lg:grid-cols-2"
          >
            {series.map((s) => (
              <StatsTimeSeriesChart
                key={`${s.metric}-${range}`}
                title={METRIC_LABELS[s.metric] ?? s.metric}
                metric={s.metric}
                seriesUrl="/api/account/stats/analytics"
                points={s.points}
                range={range}
                valueFormatter={
                  s.metric === 'storage_added'
                    ? (v) => formatFileSize(v) ?? '0'
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </StatsSection>

      <div
        className="grid gap-8 lg:grid-cols-2"
      >
        <StatsRankedList
          title="Top photos by views"
          items={detail.topPhotosByViews}
          valueLabel="Views"
        />
        <StatsRankedList
          title="Top photos by likes"
          items={detail.topPhotosByLikes}
          valueLabel="Likes"
        />
        <StatsRankedList
          title="Largest files"
          items={detail.largestPhotos}
          valueLabel="Size"
          formatValue={formatBytesRanked}
        />
      </div>

      {(detail.mimeTypes.length > 0 || detail.licenses.length > 0 || detail.topTags.length > 0) && (
        <StatsSection
          title="Your uploads"
          description="Format, license, and tag breakdown"
        >
          <div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            <StatsDonutChart title="File formats" items={detail.mimeTypes} />
            <StatsDonutChart title="Licenses" items={detail.licenses} />
            <StatsDonutChart title="Top tags" items={detail.topTags} />
          </div>
        </StatsSection>
      )}
      </div>
    </PageContainer>
  );
}
