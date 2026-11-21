export function clampSlideIndex(index: number, slideCount: number): number {
  if (slideCount <= 0) return 0;
  return Math.max(0, Math.min(index, slideCount - 1));
}

export function parseSlideHash(hash: string): number | null {
  const trimmed = hash.trim();
  const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  const match = /^slide-(\d+)$/.exec(normalized);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function slideHash(index: number): string {
  return `#slide-${index}`;
}

export function nextSlideIndex(current: number, slideCount: number): number {
  return clampSlideIndex(current + 1, slideCount);
}

export function previousSlideIndex(current: number, slideCount: number): number {
  return clampSlideIndex(current - 1, slideCount);
}
