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

/**
 * True while a PhotoSwipe gallery is open (fullscreen).
 */
export function isPhotoSwipeOpen() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('.pswp--open'));
}

/**
 * Close any PhotoSwipe instance still attached to the document.
 * Used on client navigations so a lightbox from a previous route cannot cover the next page.
 */
export function closeOpenPhotoSwipes() {
  if (typeof document === 'undefined') return;

  document.querySelectorAll('.pswp').forEach((root) => {
    const closeButton = root.querySelector<HTMLButtonElement>('.pswp__button--close');
    if (closeButton) {
      closeButton.click();
      return;
    }
    root.remove();
  });
}
