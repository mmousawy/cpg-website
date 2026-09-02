'use client';

import { BarChartIcon, LineChartIcon, ResetZoomIcon } from '@/components/icons/stats/StatsChartIcons';
import StatsChartTooltip, { STATS_CHART_TOOLTIP_WRAPPER_STYLE } from '@/components/stats/StatsChartTooltip';
import type { StatsRange, StatsTimeSeriesPoint } from '@/types/stats';
import {
  bucketEndInclusive,
  bucketForSpanMs,
  formatChartDateLabel,
  getRangeConfig,
  isFinerBucket,
  parseSeriesDateKey,
  type StatsBucket,
} from '@/utils/stats/timeSeries';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MouseHandlerDataParam } from 'recharts';
import clsx from 'clsx';

type ChartPoint = StatsTimeSeriesPoint & { label: string };

type StatsTimeSeriesChartProps = {
  title: string;
  metric: string;
  seriesUrl: string;
  points: StatsTimeSeriesPoint[];
  range: StatsRange;
  valueFormatter?: (value: number) => string;
  className?: string;
};

function tooltipIndex(state: MouseHandlerDataParam | null | undefined): number | null {
  const raw = state?.activeTooltipIndex ?? state?.activeIndex;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export default function StatsTimeSeriesChart({
  title,
  metric,
  seriesUrl,
  points,
  range,
  valueFormatter = (v) => v.toLocaleString(),
  className,
}: StatsTimeSeriesChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const baseBucket = getRangeConfig(range).bucket;

  const [zoomPoints, setZoomPoints] = useState<StatsTimeSeriesPoint[] | null>(null);
  const [displayBucket, setDisplayBucket] = useState<StatsBucket>(baseBucket);
  const [indexZoom, setIndexZoom] = useState<{ start: number; end: number } | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [isZoomLoading, setIsZoomLoading] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const dragRef = useRef<{ start: number } | null>(null);

  useEffect(() => {
    setZoomPoints(null);
    setDisplayBucket(baseBucket);
    setIndexZoom(null);
    setSelection(null);
    dragRef.current = null;
  }, [range, baseBucket]);

  const sourcePoints = zoomPoints ?? points;
  const fullData = useMemo<ChartPoint[]>(
    () =>
      sourcePoints.map((p) => ({
        ...p,
        label: formatChartDateLabel(p.date, displayBucket),
      })),
    [sourcePoints, displayBucket],
  );

  const data = indexZoom ? fullData.slice(indexZoom.start, indexZoom.end + 1) : fullData;
  const isZoomed = zoomPoints != null || indexZoom != null;

  const applyZoom = useCallback(async () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || !selection) {
      setSelection(null);
      return;
    }
    const from = Math.min(selection.start, selection.end);
    const to = Math.max(selection.start, selection.end);
    setSelection(null);
    if (to - from < 1) return;

    const offset = indexZoom?.start ?? 0;
    const absFrom = offset + from;
    const absTo = offset + to;
    const startKey = fullData[absFrom]?.date;
    const endKey = fullData[absTo]?.date;
    if (!startKey || !endKey) return;

    const start = parseSeriesDateKey(startKey);
    const end = bucketEndInclusive(endKey, displayBucket);
    const nextBucket = bucketForSpanMs(end.getTime() - start.getTime());

    if (!isFinerBucket(nextBucket, displayBucket)) {
      setIndexZoom({ start: absFrom, end: absTo });
      return;
    }

    setIsZoomLoading(true);
    try {
      const url = new URL(seriesUrl, window.location.origin);
      url.searchParams.set('metric', metric);
      url.searchParams.set('from', start.toISOString());
      url.searchParams.set('to', end.toISOString());
      url.searchParams.set('bucket', nextBucket);
      const res = await fetch(`${url.pathname}${url.search}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const nextPoints = (json.series?.[0]?.points as StatsTimeSeriesPoint[] | undefined) ?? [];
      setZoomPoints(nextPoints);
      setDisplayBucket(nextBucket);
      setIndexZoom(null);
    } catch (err) {
      console.error(err);
      setIndexZoom({ start: absFrom, end: absTo });
    } finally {
      setIsZoomLoading(false);
    }
  }, [selection, indexZoom, fullData, displayBucket, seriesUrl, metric]);

  useEffect(() => {
    const onUp = () => {
      if (dragRef.current) void applyZoom();
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [applyZoom]);

  const onPointerDown = (state: MouseHandlerDataParam) => {
    const idx = tooltipIndex(state);
    if (idx == null || data.length < 2) return;
    dragRef.current = { start: idx };
    setSelection({ start: idx, end: idx });
  };

  const onPointerMove = (state: MouseHandlerDataParam) => {
    if (!dragRef.current) return;
    const idx = tooltipIndex(state);
    if (idx == null) return;
    setSelection((prev) => (prev ? { ...prev, end: idx } : { start: idx, end: idx }));
  };

  const resetZoom = () => {
    setZoomPoints(null);
    setDisplayBucket(baseBucket);
    setIndexZoom(null);
  };

  const selectX1 = selection ? data[Math.min(selection.start, selection.end)]?.date : undefined;
  const selectX2 = selection ? data[Math.max(selection.start, selection.end)]?.date : undefined;
  const canZoom = data.length >= 2;

  return (
    <div className={className}>
      <div
        className="mb-3 flex items-center justify-between gap-3"
      >
        <h3
          className="text-base font-semibold font-heading text-foreground"
        >
          {title}
        </h3>
        <div
          className="flex items-center gap-1"
        >
          <button
            type="button"
            onClick={() => setChartType('bar')}
            aria-pressed={chartType === 'bar'}
            aria-label="Bar chart"
            title="Bar chart"
            className={clsx(
              'rounded-md p-1 transition-colors',
              chartType === 'bar'
                ? 'bg-background-light text-foreground'
                : 'text-foreground/50 hover:bg-background-light hover:text-foreground',
            )}
          >
            <BarChartIcon />
          </button>
          <button
            type="button"
            onClick={() => setChartType('line')}
            aria-pressed={chartType === 'line'}
            aria-label="Line chart"
            title="Line chart"
            className={clsx(
              'rounded-md p-1 transition-colors',
              chartType === 'line'
                ? 'bg-background-light text-foreground'
                : 'text-foreground/50 hover:bg-background-light hover:text-foreground',
            )}
          >
            <LineChartIcon />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            disabled={!isZoomed}
            aria-label="Reset zoom"
            title="Reset zoom"
            className={clsx(
              'rounded-md p-1 transition-colors',
              isZoomed
                ? 'text-foreground/50 hover:bg-background-light hover:text-foreground'
                : 'text-foreground/20 cursor-default',
            )}
          >
            <ResetZoomIcon />
          </button>
        </div>
      </div>
      <div
        className="relative h-56 w-full select-none"
      >
        {isZoomLoading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 text-xs text-foreground/70"
          >
            Loading detail…
          </div>
        ) : null}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            onMouseDown={canZoom ? onPointerDown : undefined}
            onMouseMove={canZoom ? onPointerMove : undefined}
            onTouchStart={canZoom ? onPointerDown : undefined}
            onTouchMove={canZoom ? onPointerMove : undefined}
            onDoubleClick={resetZoom}
            style={{ cursor: canZoom ? 'crosshair' : 'default' }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border-color" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              tickFormatter={(date: string) => formatChartDateLabel(date, displayBucket)}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              width={40}
              tickFormatter={(v) => valueFormatter(Number(v))}
            />
            <Tooltip
              active={selection || isZoomLoading ? false : undefined}
              cursor={selection ? false : { stroke: 'var(--primary)', strokeOpacity: 0.35 }}
              isAnimationActive={false}
              wrapperStyle={STATS_CHART_TOOLTIP_WRAPPER_STYLE}
              content={
                <StatsChartTooltip
                  labelFormatter={(date) => formatChartDateLabel(date, displayBucket)}
                  valueFormatter={valueFormatter}
                />
              }
            />
            {chartType === 'bar' ? (
              <Bar
                dataKey="value"
                fill="var(--primary)"
                isAnimationActive={false}
                maxBarSize={28}
              />
            ) : (
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                fill={`url(#${gradientId})`}
                strokeWidth={2}
                isAnimationActive={false}
              />
            )}
            {selectX1 && selectX2 && selectX1 !== selectX2 ? (
              <ReferenceArea
                x1={selectX1}
                x2={selectX2}
                stroke="var(--primary)"
                strokeOpacity={0.4}
                fill="var(--primary)"
                fillOpacity={0.12}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
