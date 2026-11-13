const STORAGE_KEY = 'cpg-photo-overview-path';

const overviewListeners = new Set<() => void>();

function notifyOverviewListeners() {
  overviewListeners.forEach((listener) => listener());
}

export function isPhotoDetailPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  const photoIndex = segments.lastIndexOf('photo');
  if (photoIndex === -1) return false;
  return photoIndex < segments.length - 1;
}

export function getPhotoOverviewPath(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setPhotoOverviewPath(path: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
    notifyOverviewListeners();
  } catch {
    // ignore quota / private mode
  }
}

export function clearPhotoOverviewPath() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    notifyOverviewListeners();
  } catch {
    // ignore
  }
}

export function subscribePhotoOverview(listener: () => void): () => void {
  overviewListeners.add(listener);
  return () => {
    overviewListeners.delete(listener);
  };
}

export function getPhotoCollectionFallbackHref({
  pathname,
  nickname,
  albumSlug,
  basePath,
}: {
  pathname?: string;
  nickname?: string;
  albumSlug?: string;
  basePath?: string;
}): string {
  if (nickname && albumSlug) {
    return `/@${nickname}/album/${albumSlug}`;
  }
  if (basePath) {
    return basePath;
  }
  if (nickname) {
    return `/@${nickname}`;
  }
  if (pathname) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] === 'events' && segments[1]) {
      return `/events/${segments[1]}`;
    }
    if (segments[0] === 'challenges' && segments[1]) {
      return `/challenges/${segments[1]}`;
    }
    const atIndex = segments.findIndex((s) => s.startsWith('@'));
    if (atIndex >= 0) {
      return `/${segments[atIndex]}`;
    }
  }
  return '/gallery';
}

const GALLERY_SECTION_LABELS: Record<string, string> = {
  '/gallery': 'gallery',
  '/gallery/photos': 'community photos',
  '/gallery/recent-likes': 'recent likes',
  '/gallery/most-viewed': 'most viewed',
  '/gallery/albums': 'albums',
};

/** Human section name for a stored overview URL (not page titles or slugs). */
function deriveOverviewLabel(overviewPath: string): string | null {
  const pathname = overviewPath.split('?')[0] ?? overviewPath;
  if (pathname === '/' || pathname === '') {
    return 'home';
  }

  const galleryLabel = GALLERY_SECTION_LABELS[pathname];
  if (galleryLabel) {
    return galleryLabel;
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'gallery' && segments[1] === 'tag' && segments[2]) {
    return 'tag';
  }

  const atIndex = segments.findIndex((s) => s.startsWith('@'));
  if (atIndex >= 0 && !isPhotoDetailPath(pathname)) {
    if (segments[atIndex + 1] === 'album' && segments[atIndex + 2]) {
      return 'album';
    }
  }
  if (atIndex >= 0) {
    return 'photostream';
  }

  if (segments[0] === 'events') {
    return segments.length === 1 ? 'events' : 'event';
  }
  if (segments[0] === 'challenges') {
    return segments.length === 1 ? 'challenges' : 'challenge';
  }
  if (pathname === '/members') {
    return 'members';
  }
  if (pathname === '/scene') {
    return 'scene';
  }

  return null;
}

export function getPhotoBackLabel({
  overviewPath,
  fallbackLabel,
}: {
  overviewPath: string | null;
  fallbackLabel: string;
}): { text: string; ariaLabel: string } {
  if (overviewPath) {
    const derived = deriveOverviewLabel(overviewPath);
    if (!derived) {
      return { text: 'Back', ariaLabel: 'Back' };
    }
    const ariaLabel = `Back to ${derived}`;
    return { text: ariaLabel, ariaLabel };
  }

  const trimmed = fallbackLabel.trim() || 'collection';
  const ariaLabel = `Back to ${trimmed}`;
  return { text: ariaLabel, ariaLabel };
}

export function getRoutePathWithSearch(pathname: string): string {
  if (typeof window === 'undefined') return pathname;
  return `${pathname}${window.location.search}`;
}

/**
 * Call on each client pathname change (from DocumentRouteState).
 * Stores the page you were on when entering a photo detail route; keeps it across photo-to-photo hops.
 */
export function syncPhotoOverviewOnRouteChange(
  pathname: string,
  prevPathname: string,
  prevRouteKey: string,
) {
  const pathChanged = prevPathname !== pathname;
  const isPhoto = isPhotoDetailPath(pathname);
  const wasPhoto = isPhotoDetailPath(prevPathname);

  if (!isPhoto) {
    clearPhotoOverviewPath();
    return;
  }

  if (pathChanged && !wasPhoto && prevRouteKey) {
    setPhotoOverviewPath(prevRouteKey);
  }
}
