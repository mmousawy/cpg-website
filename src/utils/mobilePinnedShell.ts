import { isManagePagePath, MANAGE_PAGE_PATHS } from '@/utils/managePage';
import { isOnboardingPath } from '@/utils/onboardingPath';

/** Routes that pin chrome and scroll `#main-content` on small screens. */
export function isMobilePinnedShellPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return !isManagePagePath(pathname) && !isOnboardingPath(pathname);
}

/**
 * Injected before paint so mobile overflow lock + shell class exist before
 * Safari restores `window.scrollY` (which would freeze the page headers above
 * the viewport once html/body overflow is hidden).
 */
export const MOBILE_PINNED_SHELL_BOOT_SCRIPT = `(function(){var p=location.pathname;var a=${JSON.stringify(MANAGE_PAGE_PATHS)};for(var i=0;i<a.length;i++){if(p===a[i]||p.indexOf(a[i]+"/")===0)return;}if(p==="/onboarding"||p.indexOf("/onboarding/")===0)return;if(!window.matchMedia("(max-width: 639px)").matches)return;document.documentElement.classList.add("mobile-pinned-shell");if(history.scrollRestoration)history.scrollRestoration="manual";window.scrollTo(0,0);})();`;
