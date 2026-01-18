/**
 * Lazy loader for PhotoSwipe lightbox library
 * This utility ensures PhotoSwipe is only loaded when actually needed,
 * reducing initial bundle size by ~25 KiB
 */

let PhotoSwipeLightboxModule: typeof import('photoswipe/lightbox') | null = null;
let stylesLoaded = false;

/**
 * Initialize PhotoSwipe lightbox module and styles
 * Returns the PhotoSwipeLightbox class
 */
export async function initPhotoSwipe() {
  // Load styles only once
  if (!stylesLoaded) {
    // @ts-expect-error - CSS imports don't have type declarations
    await import('photoswipe/style.css');
    stylesLoaded = true;
  }

  // Load lightbox module only once
  if (!PhotoSwipeLightboxModule) {
    PhotoSwipeLightboxModule = await import('photoswipe/lightbox');
  }

  return PhotoSwipeLightboxModule.default;
}

/**
 * Type helper for PhotoSwipeLightbox instance
 */
export type PhotoSwipeLightboxInstance = InstanceType<Awaited<ReturnType<typeof initPhotoSwipe>>>;
