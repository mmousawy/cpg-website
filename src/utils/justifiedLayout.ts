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
  /** Width of the row (set only for a single photo that would otherwise be too tall) */
  width?: number;
}

export interface LayoutOptions {
  minPhotosPerRow?: number; // Minimum photos per row (default: 2)
  maxPhotosPerRow?: number; // Maximum photos per row (default: 8)
  targetRowHeight?: number; // Target row height in pixels (default: 240)
  maxRowHeight?: number; // Maximum row height in pixels (default: 350)
  gap?: number; // Gap between photos in pixels (default: 4)
}

const DEFAULT_TARGET_ROW_HEIGHT = 240;
const DEFAULT_GAP = 4; // Gap between photos (gap-1 = 4px)
const SINGLE_PHOTO_MAX_HEIGHT = 450;
/** Tallest portrait we'll display (4:5). Taller images are object-cover cropped. */
const MIN_DISPLAY_ASPECT_RATIO = 4 / 5;

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
  gap: number,
): number {
  if (aspectRatios.length === 0) return DEFAULT_TARGET_ROW_HEIGHT;
  const totalAspectRatio = aspectRatios.reduce((sum, ar) => sum + ar, 0);
  const totalGapWidth = (aspectRatios.length - 1) * gap;
  return (containerWidth - totalGapWidth) / totalAspectRatio;
}

/**
 * Build a row that fills the container width.
 * A lone photo is height-capped so it doesn't become a giant portrait.
 */
function buildRow(
  photos: PhotoData[],
  containerWidth: number,
  gap: number,
): PhotoRow {
  if (photos.length === 1) {
    const photo = photos[0];
    const maxWidth = SINGLE_PHOTO_MAX_HEIGHT * photo.aspectRatio;
    const effectiveWidth = Math.min(containerWidth, maxWidth);
    const rowHeight = effectiveWidth / photo.aspectRatio;
    const row = createRow(photos, rowHeight, effectiveWidth, gap);
    if (effectiveWidth < containerWidth) {
      row.width = effectiveWidth;
    }
    return row;
  }

  const rowHeight = getRowHeight(
    photos.map((p) => p.aspectRatio),
    containerWidth,
    gap,
  );
  return createRow(photos, rowHeight, containerWidth, gap);
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
    gap = DEFAULT_GAP,
  } = options;

  if (photos.length === 0 || containerWidth <= 0) return [];

  const photoData: PhotoData[] = photos.map((p) => ({
    id: p.id,
    url: p.url,
    // Clamp portraits to 4:5; the grid also caps row height at 720px
    aspectRatio: Math.max((p.width || 400) / (p.height || 400), MIN_DISPLAY_ASPECT_RATIO),
  }));

  const n = photoData.length;

  if (n < minPhotosPerRow) {
    return [buildRow(photoData, containerWidth, gap)];
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
      const rowHeight = getRowHeight(rowAspectRatios, containerWidth, gap);
      const rowSignature = getRowSignature(rowPhotos);

      // Prefer packing more photos into rows that would otherwise be very tall
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

  let start = 0;
  return rowBreaks.map((end) => {
    const row = buildRow(photoData.slice(start, end), containerWidth, gap);
    start = end;
    return row;
  });
}

function createRow(
  photos: PhotoData[],
  rowHeight: number,
  containerWidth: number,
  gap: number,
): PhotoRow {
  const totalGaps = (photos.length - 1) * gap;
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
