'use client';

type TooltipPayloadItem = {
  value?: unknown;
  name?: unknown;
};

type StatsChartTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayloadItem>;
  label?: string | number;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number) => string;
};

export default function StatsChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = (v) => v.toLocaleString(),
}: StatsChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const value = Number(item.value ?? 0);
  if (!Number.isFinite(value)) return null;

  const fromName = item.name != null ? String(item.name) : '';
  const rawLabel = label != null && label !== '' ? String(label) : fromName;
  const headingSource =
    labelFormatter || !fromName || !/^\d+$/.test(rawLabel) ? rawLabel : fromName;
  const heading = labelFormatter ? labelFormatter(headingSource) : headingSource;

  return (
    <div
      className="overflow-hidden rounded-md border border-border-color bg-background-light/80 bg-no-noise shadow-lg backdrop-blur-md"
    >
      <div
        className="px-3 py-2"
      >
        {heading ? (
          <p
            className="text-xs font-medium text-foreground/60"
          >
            {heading}
          </p>
        ) : null}
        <p
          className="mt-0.5 text-sm font-semibold font-heading text-foreground"
        >
          {valueFormatter(value)}
        </p>
      </div>
    </div>
  );
}

export const STATS_CHART_TOOLTIP_WRAPPER_STYLE = {
  background: 'none',
  border: 'none',
  boxShadow: 'none',
  outline: 'none',
  padding: 0,
  zIndex: 20,
  pointerEvents: 'none' as const,
};
