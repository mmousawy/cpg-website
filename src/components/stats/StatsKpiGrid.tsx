import type { StatsKpi } from '@/types/stats';
import { formatFileSize } from '@/utils/formatFileSize';
import clsx from 'clsx';

type StatsKpiGridProps = {
  items: StatsKpi[];
  columns?: 2 | 3 | 4;
  className?: string;
};

function formatKpiValue(item: StatsKpi): string {
  if (typeof item.value === 'string') return item.value;
  if (item.format === 'bytes') return formatFileSize(item.value) ?? '0 B';
  if (item.format === 'percent') return `${item.value}%`;
  return item.value.toLocaleString();
}

export default function StatsKpiGrid({ items, columns = 4, className }: StatsKpiGridProps) {
  const colClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  }[columns];

  return (
    <div
      className={clsx('grid gap-4', colClass, className)}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border-color bg-background-light p-4"
        >
          <p
            className="text-sm text-foreground/70"
          >
            {item.label}
          </p>
          <p
            className="mt-1 text-2xl font-semibold font-heading text-foreground"
          >
            {formatKpiValue(item)}
          </p>
          {item.delta != null && item.delta !== 0 && (
            <p
              className={clsx(
                'mt-1 text-xs font-medium',
                item.delta > 0 ? 'text-green-600' : 'text-red-600',
              )}
            >
              {item.delta > 0 ? '+' : ''}
              {item.delta.toLocaleString()}
              {' '}
              in period
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
