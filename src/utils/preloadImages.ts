/**
 * Preload images to prevent layout shift when they're displayed
 */
export function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Resolve even on error to not block
          // Use the thumbnail URL format that PhotoCard uses
          const thumbnailUrl = `${url}?width=400&height=400&resize=cover`;
          img.src = thumbnailUrl;
        }),
    ),
  ).then(() => {});
}
