'use client';

import { useAnimatedNumbers } from './useAnimatedNumbers';

type ExposureHistogramProps = {
  bins: number[];
};

const WIDTH = 112;
const HEIGHT = 52;
const CHART_INSET = 2;
const DISPLAY_BINS = 48;

function groupIntoBars(bins: number[]) {
  if (bins.length <= DISPLAY_BINS) return [...bins];
  const sums = new Array<number>(DISPLAY_BINS).fill(0);
  const counts = new Array<number>(DISPLAY_BINS).fill(0);
  for (let index = 0; index < bins.length; index += 1) {
    const slot = Math.min(DISPLAY_BINS - 1, Math.floor((index * DISPLAY_BINS) / bins.length));
    sums[slot] = (sums[slot] ?? 0) + (bins[index] ?? 0);
    counts[slot] = (counts[slot] ?? 0) + 1;
  }
  return sums.map((sum, slot) => sum / (counts[slot] || 1));
}

/** Blend each bar with the bar on either side, then scale the tallest back to full height. */
function barsForDisplay(bins: number[]) {
  const grouped = groupIntoBars(bins);
  const smoothed = grouped.map((value, index) => {
    const previous = grouped[index - 1] ?? 0;
    const next = grouped[index + 1] ?? 0;
    return (previous + value + next) / 3;
  });
  const peak = Math.max(...smoothed);
  if (peak <= 0) return smoothed;
  return smoothed.map((value) => value / peak);
}

export default function ExposureHistogram({ bins }: ExposureHistogramProps) {
  const animatedBins = useAnimatedNumbers(barsForDisplay(bins));
  const barWidth = (WIDTH - CHART_INSET * 2) / animatedBins.length;
  const chartHeight = HEIGHT - CHART_INSET * 2;

  return (
    <div
      className="pointer-events-none absolute top-3 right-3 z-20 rounded-md border border-white/25 bg-black/60 p-1.5 shadow-sm backdrop-blur-sm"
      aria-hidden
    >
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Exposure histogram"
      >
        <rect
          x={0}
          y={0}
          width={WIDTH}
          height={HEIGHT}
          fill="transparent"
        />
        {animatedBins.map((value, index) => {
          const barHeight = Math.max(0, value * chartHeight);
          const x = CHART_INSET + index * barWidth;
          const y = HEIGHT - CHART_INSET - barHeight;
          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={Math.max(0.5, barWidth - 0.6)}
              height={barHeight}
              fill="#d8dee8"
              opacity={0.9}
            />
          );
        })}
      </svg>
    </div>
  );
}
