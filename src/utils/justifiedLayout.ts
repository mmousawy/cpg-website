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
  /** Width of the row (may be less than container for single portrait photos) */
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
 * Calculate the "cost" of a row - how far its height deviates from target
 */
function getRowCost(
  aspectRatios: number[],
  containerWidth: number,
  targetHeight: number,
): number {
  const height = getRowHeight(aspectRatios, containerWidth);
  return Math.abs(height - targetHeight);
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
    const maxHeight = 450; // Max height for single photo
    // Calculate width based on max height
    const maxWidth = maxHeight * photo.aspectRatio;
    // Use the smaller of container width or calculated max width
    const effectiveWidth = Math.min(containerWidth, maxWidth);
    const rowHeight = effectiveWidth / photo.aspectRatio;
    const row = createRow(photoData, rowHeight, effectiveWidth);
    // Mark row as narrower than container if applicable
    if (effectiveWidth < containerWidth) {
      row.width = effectiveWidth;
    }
    return [row];
  }

  // Special case: fewer photos than minimum per row (but more than 1)
  if (n < minPhotosPerRow) {
    const rowHeight = getRowHeight(
      photoData.map((p) => p.aspectRatio),
      containerWidth,
    );
    return [createRow(photoData, Math.min(rowHeight, maxRowHeight), containerWidth)];
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

    // Try all possible row sizes (respecting min/max)
    const minJ = Math.max(0, i - maxPhotosPerRow);
    const maxJ = Math.max(0, i - minPhotosPerRow);

    // Allow smaller rows only for the last row
    const isLastRow = i === n;
    const actualMinJ = isLastRow ? Math.max(0, i - maxPhotosPerRow) : minJ;
    const actualMaxJ = isLastRow ? i - 1 : maxJ;

    for (let j = actualMinJ; j <= actualMaxJ; j++) {
      const rowSize = i - j;

      // Skip if row is too small (except last row can have 1 if needed)
      if (!isLastRow && rowSize < minPhotosPerRow) continue;

      const rowPhotos = photoData.slice(j, i);
      const rowAspectRatios = rowPhotos.map((p) => p.aspectRatio);
      const rowHeight = getRowHeight(rowAspectRatios, containerWidth);
      const rowSignature = getRowSignature(rowPhotos);

      // Height penalty for extreme heights - strongly penalize exceeding max
      let heightPenalty = 0;
      if (rowHeight < 100) heightPenalty = 500;
      else if (rowHeight < 150) heightPenalty = 100;
      else if (rowHeight > maxRowHeight) {
        // Exponential penalty for exceeding max height - forces adding more photos
        const excess = rowHeight - maxRowHeight;
        heightPenalty = 500 + excess * 10;
      }

      // Balance penalty: only penalize big jumps (±1 is fine for playful alternating)
      const prevRowSize = dp[j].prevRowSize;
      const sizeDiff = Math.abs(rowSize - prevRowSize);
      // No penalty for ±1, heavy penalty for ±2+
      const balancePenalty = sizeDiff <= 1 ? 0 : sizeDiff * sizeDiff * 50;

      // Light penalty for extreme deviation from ideal
      const idealDiff = Math.abs(rowSize - idealPhotosPerRow);
      const idealPenalty = idealDiff > 1.5 ? (idealDiff - 1) * 10 : 0;

      // Variety penalty: discourage identical shape patterns in consecutive rows
      const prevSignature = dp[j].prevSignature;
      let varietyPenalty = 0;
      if (prevSignature.length > 0 && rowSignature === prevSignature) {
        // Heavy penalty for identical patterns (e.g., PLL followed by PLL)
        varietyPenalty = 150;
      } else if (prevSignature.length > 0 && rowSignature.length === prevSignature.length) {
        // Light penalty for same length but different pattern
        varietyPenalty = 20;
      }

      const rowCost = getRowCost(rowAspectRatios, containerWidth, targetRowHeight)
        + heightPenalty
        + balancePenalty
        + idealPenalty
        + varietyPenalty;
      const totalCost = dp[j].cost + rowCost;

      if (totalCost < dp[i].cost) {
        dp[i] = { cost: totalCost, prev: j, prevRowSize: rowSize, prevSignature: rowSignature };
      }
    }

    // Fallback if no valid configuration found
    if (dp[i].cost === Infinity && i > 0) {
      const fallbackStart = Math.max(0, i - minPhotosPerRow);
      const fallbackPhotos = photoData.slice(fallbackStart, i);
      dp[i] = {
        cost: dp[fallbackStart].cost + 2000,
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
  const rows: PhotoRow[] = [];
  let start = 0;
  for (const end of rowBreaks) {
    const rowPhotos = photoData.slice(start, end);
    const rowHeight = getRowHeight(
      rowPhotos.map((p) => p.aspectRatio),
      containerWidth,
    );
    // Cap row height for single/few photo rows
    const cappedHeight = Math.min(rowHeight, maxRowHeight);
    rows.push(createRow(rowPhotos, cappedHeight, containerWidth));
    start = end;
  }

  return rows;
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
