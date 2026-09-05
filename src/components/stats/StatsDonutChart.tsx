'use client';

import StatsChartTooltip, { STATS_CHART_TOOLTIP_WRAPPER_STYLE } from '@/components/stats/StatsChartTooltip';
import type { StatsBreakdownItem } from '@/types/stats';
import clsx from 'clsx';
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
} from 'recharts';
import type { PieSectorShapeProps } from 'recharts/types/polar/Pie';

/** Distinct categorical colors (varied hue, not all greens). */
const CHART_COLORS = [
  '#38785f',
  '#2563eb',
  '#b45309',
  '#7c3aed',
  '#db2777',
  '#0d9488',
  '#dc2626',
  '#ca8a04',
  '#4f46e5',
  '#0891b2',
  '#65a30d',
  '#c026d3',
];

const HIGHLIGHT_ANIMATION_MS = 250;
const ACTIVE_SECTOR_RADIUS_GROWTH = 6;

function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

type SectorVisual = {
  opacity: number;
  outerRadius: number;
  baseOuterRadius: number;
};

function sectorTarget(
  activeIndex: number | null,
  index: number,
  baseOuterRadius: number,
): Pick<SectorVisual, 'opacity' | 'outerRadius'> {
  const highlighted = activeIndex === null || activeIndex === index;
  const isActive = activeIndex === index;
  return {
    opacity: highlighted ? 1 : 0.35,
    outerRadius: baseOuterRadius + (isActive ? ACTIVE_SECTOR_RADIUS_GROWTH : 0),
  };
}

type StatsDonutChartProps = {
  title: string;
  items: StatsBreakdownItem[];
  className?: string;
};

export default function StatsDonutChart({ title, items, className }: StatsDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const activeIndexRef = useRef(activeIndex);
  const sectorVisualsRef = useRef<Map<number, SectorVisual>>(new Map());

  activeIndexRef.current = activeIndex;

  const clearHighlight = useCallback(() => setActiveIndex(null), []);

  useEffect(() => {
    const fromSnapshot = new Map<number, Pick<SectorVisual, 'opacity' | 'outerRadius'>>();
    for (const [index, visual] of sectorVisualsRef.current) {
      fromSnapshot.set(index, {
        opacity: visual.opacity,
        outerRadius: visual.outerRadius,
      });
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = easeOutCubic(Math.min(1, (now - start) / HIGHLIGHT_ANIMATION_MS));
      let stillAnimating = false;

      for (const [index, visual] of sectorVisualsRef.current) {
        const target = sectorTarget(activeIndex, index, visual.baseOuterRadius);
        const from = fromSnapshot.get(index) ?? target;
        sectorVisualsRef.current.set(index, {
          baseOuterRadius: visual.baseOuterRadius,
          opacity: from.opacity + (target.opacity - from.opacity) * progress,
          outerRadius: from.outerRadius + (target.outerRadius - from.outerRadius) * progress,
        });
      }

      rerender();
      stillAnimating = progress < 1;
      if (stillAnimating) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeIndex]);

  const renderSector = useCallback((props: PieSectorShapeProps) => {
    const index = props.index;
    const baseOuterRadius = props.outerRadius ?? 0;
    let visual = sectorVisualsRef.current.get(index);

    if (!visual) {
      const target = sectorTarget(activeIndexRef.current, index, baseOuterRadius);
      visual = { ...target, baseOuterRadius };
      sectorVisualsRef.current.set(index, visual);
    } else if (visual.baseOuterRadius !== baseOuterRadius) {
      const scale = baseOuterRadius / visual.baseOuterRadius;
      visual = {
        ...visual,
        baseOuterRadius,
        outerRadius: visual.outerRadius * scale,
      };
      sectorVisualsRef.current.set(index, visual);
    }

    return (
      <Sector
        {...props}
        fill={chartColor(index)}
        opacity={visual.opacity}
        outerRadius={visual.outerRadius}
        stroke="var(--background)"
        strokeWidth={2}
      />
    );
  }, []);

  if (!items.length) {
    return (
      <div className={className}>
        <h3
          className="mb-3 text-base font-semibold font-heading text-foreground"
        >
          {title}
        </h3>
        <p
          className="text-sm text-foreground/60"
        >
          No data yet
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3
        className="mb-3 text-base font-semibold font-heading text-foreground"
      >
        {title}
      </h3>
      <div
        className="mx-auto h-44 w-full rounded-lg bg-background p-3"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="value"
              nameKey="label"
              innerRadius="52%"
              outerRadius="80%"
              paddingAngle={2}
              isAnimationActive={false}
              shape={renderSector}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={clearHighlight}
            />
            <Tooltip
              isAnimationActive={false}
              wrapperStyle={STATS_CHART_TOOLTIP_WRAPPER_STYLE}
              content={<StatsChartTooltip />}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul
        className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5"
      >
        {items.map((item, index) => (
          <li
            key={item.label}
            className={clsx(
              'flex min-w-0 max-w-full cursor-default items-center gap-1.5 rounded px-1 text-xs transition-colors duration-200 ease-out',
              activeIndex === index
                ? 'text-foreground font-medium'
                : 'text-foreground/80',
            )}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={clearHighlight}
          >
            <span
              className={clsx(
                'size-2 shrink-0 rounded-full transition-transform duration-200 ease-out',
                activeIndex === index && 'scale-125',
              )}
              style={{ backgroundColor: chartColor(index) }}
            />
            <span
              className="min-w-0 truncate"
              title={item.label}
            >
              {item.label}
            </span>
            <span
              className={clsx(
                'shrink-0',
                activeIndex === index ? 'text-foreground/70' : 'text-foreground/50',
              )}
            >
              {item.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
