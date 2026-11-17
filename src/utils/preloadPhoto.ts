const preloadedPhotoUrls = new Set<string>();

/** Warm the browser cache for the same full-size URL the photo page renders. */
export function preloadPhoto(url: string | null | undefined): void {
  if (!url || typeof window === 'undefined' || preloadedPhotoUrls.has(url)) return;
  preloadedPhotoUrls.add(url);
  const img = new Image();
  img.fetchPriority = 'high';
  img.decoding = 'async';
  img.onload = () => { };
  img.onerror = () => { };
  img.src = url;
}
