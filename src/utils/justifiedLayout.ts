/**
 * Calculates a justified layout where photos are grouped into rows
 * Uses balanced distribution so rows have similar photo counts
 */

export interface PhotoLayoutItem {
  photo: {
    id: string;
    url: string;
    aspectRatio: number;
  };
  displayWidth: number;
  displayHeight: number;
}

export interface PhotoRow {
  items: PhotoLayoutItem[];
  height: number;
  /** Width of the row (may be less than container for height-capped portrait rows) */
  width?: number;
}

export interface LayoutOptions {
  minPhotosPerRow?: number; // Minimum photos per row (default: 2)
  maxPhotosPerRow?: number; // Maximum photos per row (default: 8)
  targetRowHeight?: number; // Target row height in pixels (default: 240)
  maxRowHeight?: number; // Maximum row height in pixels (default: 350)
}

const DEFAULT_TARGET_ROW_HEIGHT = 240;
const GAP = 4; // Gap between photos (gap-1 = 4px)

type PhotoData = { id: string; url: string; aspectRatio: number };

/**
 * Get a shape signature for a row based on aspect ratios
 * P = portrait (<0.85), S = square (0.85-1.15), L = landscape (>1.15)
 */
function getRowSignature(photos: PhotoData[]): string {
  return photos.map((p) => {
    if (p.aspectRatio < 0.85) return 'P';
    if (p.aspectRatio > 1.15) return 'L';
    return 'S';
  }).join('');
}

/**
 * Calculate row height if these photos were to fill the container width
 */
function getRowHeight(
  aspectRatios: number[],
  containerWidth: number,
): number {
  if (aspectRatios.length === 0) return DEFAULT_TARGET_ROW_HEIGHT;
  const totalAspectRatio = aspectRatios.reduce((sum, ar) => sum + ar, 0);
  const totalGapWidth = (aspectRatios.length - 1) * GAP;
  return (containerWidth - totalGapWidth) / totalAspectRatio;
}

/**
 * Build a row, capping height at maxHeight. When capped, the row is narrower
 * than the container and gets marked with a width for centered rendering.
 */
function buildRow(
  photos: PhotoData[],
  containerWidth: number,
  maxHeight: number,
): PhotoRow {
  const aspectRatios = photos.map((p) => p.aspectRatio);
  const naturalHeight = getRowHeight(aspectRatios, containerWidth);
  const cappedHeight = Math.min(naturalHeight, maxHeight);

  if (naturalHeight > maxHeight) {
    // Height-capped: photos won't fill container width
    const totalGaps = (photos.length - 1) * GAP;
    const actualWidth = photos.reduce((sum, p) => sum + cappedHeight * p.aspectRatio, 0) + totalGaps;
    const row = createRow(photos, cappedHeight, actualWidth);
    if (actualWidth < containerWidth) {
      row.width = actualWidth;
    }
    return row;
  }

  return createRow(photos, cappedHeight, containerWidth);
}

/**
 * Calculate justified layout with balanced row distribution
 * Uses dynamic programming to find optimal row breaks with balance penalty
 */
export function calculateJustifiedLayout(
  photos: Array<{ id: string; url: string; width: number; height: number }>,
  containerWidth: number,
  options: LayoutOptions = {},
): PhotoRow[] {
  const {
    minPhotosPerRow = 2,
    maxPhotosPerRow = 8,
    targetRowHeight = DEFAULT_TARGET_ROW_HEIGHT,
    maxRowHeight = 350,
  } = options;

  if (photos.length === 0 || containerWidth <= 0) return [];

  // Convert to aspect ratios
  const photoData: PhotoData[] = photos.map((p) => ({
    id: p.id,
    url: p.url,
    aspectRatio: (p.width || 400) / (p.height || 400),
  }));

  const n = photoData.length;

  // Special case: single photo - limit height to prevent super tall images
  if (n === 1) {
    const photo = photoData[0];
    const maxHeight = 450;
    const maxWidth = maxHeight * photo.aspectRatio;
    const effectiveWidth = Math.min(containerWidth, maxWidth);
    const rowHeight = effectiveWidth / photo.aspectRatio;
    const row = createRow(photoData, rowHeight, effectiveWidth);
    if (effectiveWidth < containerWidth) {
      row.width = effectiveWidth;
    }
    return [row];
  }

  // Special case: fewer photos than minimum per row (but more than 1)
  if (n < minPhotosPerRow) {
    return [buildRow(photoData, containerWidth, maxRowHeight)];
  }

  // Calculate ideal photos per row for balancing
  const estimatedRows = Math.max(1, Math.round(n / ((minPhotosPerRow + maxPhotosPerRow) / 2)));
  const idealPhotosPerRow = n / estimatedRows;

  // Dynamic programming approach
  // dp[i] = { cost, prev, prevRowSize, prevSignature } for optimal layout of photos 0..i-1
  const dp: Array<{ cost: number; prev: number; prevRowSize: number; prevSignature: string }> = new Array(n + 1);
  dp[0] = { cost: 0, prev: -1, prevRowSize: idealPhotosPerRow, prevSignature: '' };

  for (let i = 1; i <= n; i++) {
    dp[i] = { cost: Infinity, prev: -1, prevRowSize: 0, prevSignature: '' };

    const isLastRow = i === n;
    const minJ = Math.max(0, i - maxPhotosPerRow);
    // Last row can have fewer photos (down to 1); other rows respect minPhotosPerRow
    const maxJ = isLastRow ? i - 1 : Math.max(0, i - minPhotosPerRow);

    for (let j = minJ; j <= maxJ; j++) {
      const rowPhotos = photoData.slice(j, i);
      const rowAspectRatios = rowPhotos.map((p) => p.aspectRatio);
      const rowHeight = getRowHeight(rowAspectRatios, containerWidth);
      const rowSignature = getRowSignature(rowPhotos);

      // Height penalty for extreme heights
      // When row height exceeds max, the row will be capped in rendering,
      // so we use a moderate penalty to prefer better splits
      // but not make them so expensive that wildly unbalanced rows win.
      let heightPenalty = 0;
      if (rowHeight < 100) heightPenalty = 500;
      else if (rowHeight < 150) heightPenalty = 100;
      else if (rowHeight > maxRowHeight) {
        const excess = rowHeight - maxRowHeight;
        heightPenalty = 50 + Math.min(excess, 300) * 2;
      }

      // Balance penalty: no penalty for ±1, heavy penalty for ±2+
      const sizeDiff = Math.abs((i - j) - dp[j].prevRowSize);
      const balancePenalty = sizeDiff <= 1 ? 0 : sizeDiff * sizeDiff * 50;

      // Light penalty for extreme deviation from ideal
      const idealDiff = Math.abs((i - j) - idealPhotosPerRow);
      const idealPenalty = idealDiff > 1.5 ? (idealDiff - 1) * 10 : 0;

      // Variety penalty: discourage identical shape patterns in consecutive rows
      const prevSignature = dp[j].prevSignature;
      let varietyPenalty = 0;
      if (prevSignature.length > 0 && rowSignature === prevSignature) {
        varietyPenalty = 150;
      } else if (prevSignature.length > 0 && rowSignature.length === prevSignature.length) {
        varietyPenalty = 20;
      }

      const totalCost = dp[j].cost
        + Math.abs(rowHeight - targetRowHeight)
        + heightPenalty
        + balancePenalty
        + idealPenalty
        + varietyPenalty;

      if (totalCost < dp[i].cost) {
        dp[i] = { cost: totalCost, prev: j, prevRowSize: i - j, prevSignature: rowSignature };
      }
    }

    // Fallback if no valid configuration found
    if (dp[i].cost === Infinity && i > 0) {
      const fallbackStart = Math.max(0, i - minPhotosPerRow);
      const fallbackPhotos = photoData.slice(fallbackStart, i);
      dp[i] = {
        cost: dp[fallbackStart].cost + 5000,
        prev: fallbackStart,
        prevRowSize: minPhotosPerRow,
        prevSignature: getRowSignature(fallbackPhotos),
      };
    }
  }

  // Backtrack to build rows
  const rowBreaks: number[] = [];
  let current = n;
  while (current > 0) {
    rowBreaks.unshift(current);
    current = dp[current].prev;
  }

  // Build rows from breaks
  let start = 0;
  return rowBreaks.map((end) => {
    const row = buildRow(photoData.slice(start, end), containerWidth, maxRowHeight);
    start = end;
    return row;
  });
}

function createRow(
  photos: PhotoData[],
  rowHeight: number,
  containerWidth: number,
): PhotoRow {
  const totalGaps = (photos.length - 1) * GAP;
  const availableWidth = containerWidth - totalGaps;
  const totalAspectRatio = photos.reduce((sum, p) => sum + p.aspectRatio, 0);

  return {
    items: photos.map((p) => ({
      photo: {
        id: p.id,
        url: p.url,
        aspectRatio: p.aspectRatio,
      },
      displayHeight: rowHeight,
      displayWidth: (p.aspectRatio / totalAspectRatio) * availableWidth,
    })),
    height: rowHeight,
  };
}
