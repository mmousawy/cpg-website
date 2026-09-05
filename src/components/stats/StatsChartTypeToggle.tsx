'use client';

import { BarChartIcon, LineChartIcon } from '@/components/icons/stats/StatsChartIcons';
import clsx from 'clsx';

export type StatsChartType = 'bar' | 'line';

type StatsChartTypeToggleProps = {
  value: StatsChartType;
  onChange: (value: StatsChartType) => void;
  className?: string;
};

export default function StatsChartTypeToggle({ value, onChange, className }: StatsChartTypeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Chart type"
      className={clsx(
        'stats-chart-type-toggle relative inline-grid grid-cols-2 rounded-md p-1',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'stats-chart-type-toggle__thumb btn-skeuo btn-skeuo-secondary pointer-events-none absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md border border-border-color-strong bg-background bg-no-noise dark:bg-[#2e3032]',
          value === 'bar' ? 'left-1' : 'left-1/2',
        )}
      />
      <button
        type="button"
        onClick={() => onChange('bar')}
        aria-pressed={value === 'bar'}
        aria-label="Bar chart"
        title="Bar chart"
        className={clsx(
          'relative z-10 rounded-sm p-1 transition-colors',
          value === 'bar' ? 'text-foreground' : 'text-foreground/50 hover:text-foreground',
        )}
      >
        <BarChartIcon />
      </button>
      <button
        type="button"
        onClick={() => onChange('line')}
        aria-pressed={value === 'line'}
        aria-label="Area chart"
        title="Area chart"
        className={clsx(
          'relative z-10 rounded-sm p-1 transition-colors',
          value === 'line' ? 'text-foreground' : 'text-foreground/50 hover:text-foreground',
        )}
      >
        <LineChartIcon />
      </button>
    </div>
  );
}
