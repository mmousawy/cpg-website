'use client';

import MemberStatsExplorer from '@/components/admin/MemberStatsExplorer';
import PageContainer from '@/components/layout/PageContainer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import StatsChartTypeToggle, { type StatsChartType } from '@/components/stats/StatsChartTypeToggle';
import StatsDonutChart from '@/components/stats/StatsDonutChart';
import StatsKpiGrid from '@/components/stats/StatsKpiGrid';
import StatsRangeTabs from '@/components/stats/StatsRangeTabs';
import StatsRankedList, { formatBytesRanked } from '@/components/stats/StatsRankedList';
import StatsSection from '@/components/stats/StatsSection';
import StatsTimeSeriesChart from '@/components/stats/StatsTimeSeriesChart';
import type { AdminStatsOverview, StatsRange, StatsTimeSeriesPoint } from '@/types/stats';
import { formatFileSize } from '@/utils/formatFileSize';
import { formatStorageTableRows } from '@/utils/stats/formatStorageTableRows';
import type { StatsBucket } from '@/utils/stats/timeSeries';
import clsx from 'clsx';
import { useCallback, useEffect, useState } from 'react';

type SeriesEntry = { metric: string; points: StatsTimeSeriesPoint[] };

const METRIC_LABELS: Record<string, string> = {
  signups: 'New members',
  uploads: 'Photo uploads',
  views: 'Content views',
  likes: 'Likes',
  comments: 'Comments',
  storage_added: 'Total storage',
  photos_deleted: 'Photos deleted',
};

export default function AdminStatsClient() {
  const [tab, setTab] = useState<'overview' | 'members'>('overview');
  const [range, setRange] = useState<StatsRange>('30d');
  const [overview, setOverview] = useState<AdminStatsOverview | null>(null);
  const [series, setSeries] = useState<SeriesEntry[]>([]);
  const [bucket, setBucket] = useState<StatsBucket | undefined>();
  const [chartType, setChartType] = useState<StatsChartType>('line');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?range=${range}&series=1`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOverview(data.overview);
      setSeries(data.series ?? []);
      setBucket(data.bucket);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading && !overview) {
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

  if (!overview) {
    return (
      <PageContainer>
        <p>Failed to load statistics.</p>
      </PageContainer>
    );
  }

  const kpis = overview.kpis;
  const memberTotal = kpis.members ?? 0;
  const onboardingPct = memberTotal
    ? Math.round((kpis.onboardingComplete / memberTotal) * 100)
    : 0;

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <h1
          className="text-2xl sm:text-3xl font-bold font-heading"
        >
          Statistics
        </h1>
        <p
          className="text-base sm:text-lg text-foreground/80 mt-1"
        >
          Site analytics, member usage, and preference breakdowns
        </p>
      </div>

      <div
        className="mb-6 flex flex-wrap gap-2"
      >
        {(['overview', 'members'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm font-medium border transition-colors',
              tab === id
                ? 'border-primary bg-primary text-white'
                : 'border-border-color hover:border-primary/50',
            )}
          >
            {id === 'overview' ? 'Overview' : 'Members & preferences'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div
          className="space-y-12"
        >
          <StatsKpiGrid
            items={[
              { label: 'Members', value: kpis.members ?? 0 },
              { label: 'Photos', value: kpis.photos ?? 0 },
              { label: 'Albums', value: kpis.albums ?? 0 },
              { label: 'Total views', value: kpis.views ?? 0 },
              { label: 'Likes', value: kpis.likes ?? 0 },
              { label: 'Comments', value: kpis.comments ?? 0 },
              { label: 'Events', value: kpis.events ?? 0 },
              { label: 'Submissions', value: kpis.submissions ?? 0 },
              { label: 'Total storage', value: kpis.totalStorage ?? 0, format: 'bytes' },
              { label: 'Active (30d)', value: kpis.activeLast30Days ?? 0 },
              { label: 'Onboarding complete', value: `${onboardingPct}%`, format: 'text' },
              { label: 'Suspended', value: kpis.suspendedMembers ?? 0 },
            ]}
          />

          <StatsSection
            title="Health"
            description="Queues and items needing attention"
          >
            <StatsKpiGrid
              columns={3}
              items={[
                { label: 'Pending reports', value: overview.health.pendingReports ?? 0 },
                { label: 'Pending submissions', value: overview.health.pendingSubmissions ?? 0 },
                { label: 'New feedback', value: overview.health.newFeedback ?? 0 },
                { label: 'Shared album requests', value: overview.health.pendingSharedRequests ?? 0 },
                { label: 'Pending notifications', value: overview.health.pendingNotifications ?? 0 },
                { label: 'Email batches pending', value: overview.health.pendingEmailBatches ?? 0 },
              ]}
            />
          </StatsSection>

          <StatsSection
            title="Activity over time"
            action={(
              <div
                className="flex flex-wrap items-center gap-3"
              >
                <StatsChartTypeToggle
                  value={chartType}
                  onChange={setChartType}
                />
                <StatsRangeTabs value={range} onChange={setRange} />
              </div>
            )}
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
                    seriesUrl="/api/admin/stats"
                    points={s.points}
                    range={range}
                    bucket={bucket}
                    chartType={chartType}
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

          <StatsSection title="Preference breakdowns">
            <div
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              <StatsDonutChart title="Themes" items={overview.preferences.themes} />
              <StatsDonutChart title="Album card style" items={overview.preferences.albumCardStyles} />
              <StatsDonutChart title="Default license" items={overview.preferences.defaultLicenses} />
              <StatsDonutChart title="Top interests" items={overview.preferences.topInterests} />
              <StatsDonutChart title="Email opt-outs" items={overview.preferences.emailOptOuts} />
            </div>
            <div
              className="mt-4 grid grid-cols-3 gap-4 text-sm"
            >
              <p>Newsletter opt-in: {overview.preferences.newsletterOptIn.toLocaleString()}</p>
              <p>Watermark enabled: {overview.preferences.watermarkEnabled.toLocaleString()}</p>
              <p>EXIF copyright: {overview.preferences.embedCopyrightExif.toLocaleString()}</p>
            </div>
          </StatsSection>

          <div
            className="grid gap-8 lg:grid-cols-2"
          >
            <StatsRankedList
              title="Most viewed photos"
              items={overview.topPhotosByViews}
              valueLabel="Views"
            />
            <StatsRankedList
              title="Most liked photos"
              items={overview.topPhotosByLikes}
              valueLabel="Likes"
            />
          </div>

          <StatsRankedList
            title="Storage by member"
            items={formatStorageTableRows(overview.storageByMember)}
            valueLabel="Storage"
            formatValue={formatBytesRanked}
          />
        </div>
      )}

      {tab === 'members' && (
        <StatsSection
          title="Members & preferences"
          description="Sortable table of member activity and account preferences"
        >
          <MemberStatsExplorer
            preferenceCharts={{
              themes: overview.preferences.themes,
              albumCardStyles: overview.preferences.albumCardStyles,
              defaultLicenses: overview.preferences.defaultLicenses,
              topInterests: overview.preferences.topInterests,
              emailOptOuts: overview.preferences.emailOptOuts,
            }}
          />
        </StatsSection>
      )}
    </PageContainer>
  );
}
