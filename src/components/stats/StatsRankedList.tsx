import BlurImage from '@/components/shared/BlurImage';
import type { StatsRankedItem } from '@/types/stats';
import { formatFileSize } from '@/utils/formatFileSize';
import Link from 'next/link';

type StatsRankedListProps = {
  title: string;
  items: StatsRankedItem[];
  valueLabel?: string;
  formatValue?: (value: number) => string;
  emptyMessage?: string;
  /** When false, omit the list h3 (parent section already names this block). */
  showTitle?: boolean;
};

export default function StatsRankedList({
  title,
  items,
  valueLabel = 'Count',
  formatValue = (v) => v.toLocaleString(),
  emptyMessage = 'No data yet',
  showTitle = true,
}: StatsRankedListProps) {
  const rankedItems = items.filter((item) => item.value > 0);

  return (
    <div>
      {showTitle && (
        <h3
          className="mb-3 text-base font-semibold font-heading text-foreground"
        >
          {title}
        </h3>
      )}
      {rankedItems.length === 0 ? (
        <p
          className="text-sm text-foreground/60"
        >
          {emptyMessage}
        </p>
      ) : (
        <ul
          className="space-y-2"
        >
          {rankedItems.map((item, index) => {
            const content = (
              <div
                className="flex items-center gap-3 rounded-lg border border-border-color bg-background-light p-2 hover:border-primary/40 transition-colors"
              >
                {item.imageUrl && (
                  <div
                    className="relative size-12 shrink-0 overflow-hidden rounded-sm"
                  >
                    <BlurImage
                      src={item.imageUrl}
                      alt=""
                      blurhash={item.blurhash}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div
                  className="min-w-0 flex-1"
                >
                  <p
                    className="truncate text-sm font-medium text-foreground"
                  >
                    {index + 1}. {item.title}
                  </p>
                  {item.subtitle && (
                    <p
                      className="truncate text-xs text-foreground/60"
                    >
                      {item.subtitle}
                    </p>
                  )}
                </div>
                <div
                  className="shrink-0 text-right"
                >
                  <p
                    className="text-sm font-semibold text-foreground"
                  >
                    {formatValue(item.value)}
                  </p>
                  <p
                    className="text-xs text-foreground/50"
                  >
                    {valueLabel}
                  </p>
                </div>
              </div>
            );

            return (
              <li
                key={item.id}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className="block"
                  >
                    {content}
                  </Link>
                ) : content}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function formatBytesRanked(value: number) {
  return formatFileSize(value) ?? '0 B';
}
