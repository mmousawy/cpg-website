'use client';

import StatsChartTooltip, { STATS_CHART_TOOLTIP_WRAPPER_STYLE } from '@/components/stats/StatsChartTooltip';
import type { StatsBreakdownItem } from '@/types/stats';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const CHART_COLORS = [
  'var(--primary)',
  'var(--primary-light)',
  'var(--primary-alt)',
  '#5a9c83',
  '#38785f',
  '#58c287',
  '#a6db93',
  '#2d5a47',
];

type StatsDonutChartProps = {
  title: string;
  items: StatsBreakdownItem[];
  className?: string;
};

export default function StatsDonutChart({ title, items, className }: StatsDonutChartProps) {
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
        className="mx-auto h-44 w-full max-w-[220px]"
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
            >
              {items.map((item, index) => (
                <Cell key={item.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
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
            className="flex min-w-0 max-w-full items-center gap-1.5 text-xs text-foreground/80"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <span
              className="min-w-0 truncate"
              title={item.label}
            >
              {item.label}
            </span>
            <span
              className="shrink-0 text-foreground/50"
            >
              {item.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
