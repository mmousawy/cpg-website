export const STORYBOARD_HASH_CHANGE = 'storyboard-hash-change';

export function getStoryboardHashFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function subscribeStoryboardHash(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onChange = () => listener();

  window.addEventListener('hashchange', onChange);
  window.addEventListener('popstate', onChange);
  window.addEventListener(STORYBOARD_HASH_CHANGE, onChange);

  return () => {
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(STORYBOARD_HASH_CHANGE, onChange);
  };
}

export function notifyStoryboardHashChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(STORYBOARD_HASH_CHANGE));
}
