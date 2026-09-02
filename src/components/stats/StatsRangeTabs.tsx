'use client';

import type { StatsRange } from '@/types/stats';
import clsx from 'clsx';

const RANGES: { id: StatsRange; label: string }[] = [
  { id: '7d', label: 'Last week' },
  { id: '30d', label: 'Month' },
  { id: '90d', label: '3 months' },
  { id: 'all', label: 'All time' },
];

type StatsRangeTabsProps = {
  value: StatsRange;
  onChange: (range: StatsRange) => void;
  className?: string;
};

export default function StatsRangeTabs({ value, onChange, className }: StatsRangeTabsProps) {
  return (
    <div
      className={clsx('flex flex-wrap gap-2', className)}
    >
      {RANGES.map((range) => (
        <button
          key={range.id}
          type="button"
          onClick={() => onChange(range.id)}
          className={clsx(
            'rounded-full px-3 py-1 text-sm font-medium transition-colors border',
            value === range.id
              ? 'border-primary bg-primary text-white'
              : 'border-border-color bg-background hover:border-primary/50',
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
