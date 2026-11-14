/**
 * Layout size for object-contain photos using the same rules as BlurImage (contain mode).
 */
export function getContainedPhotoSize(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  maxHeightPx: number,
): { width: number; height: number } {
  if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || maxHeightPx <= 0) {
    return { width: 0, height: 0 };
  }
  const aspectRatio = imageWidth / imageHeight;
  const width = Math.min(containerWidth, maxHeightPx * aspectRatio);
  const height = Math.min(maxHeightPx, width / aspectRatio);
  return { width, height };
}

/**
 * Resolved `--photo-max-h` in px (matches BlurImage / Tailwind `100vh` caps).
 * The container must carry the same `--photo-max-h` arbitrary properties as the image.
 */
export function measureAlbumPhotoMaxHeightPx(container: HTMLElement): number {
  if (typeof window === 'undefined') return 0;
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;max-height:var(--photo-max-h);';
  container.appendChild(probe);
  const parsed = parseFloat(getComputedStyle(probe).maxHeight);
  container.removeChild(probe);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return Math.max(0, window.innerHeight - 154);
}
