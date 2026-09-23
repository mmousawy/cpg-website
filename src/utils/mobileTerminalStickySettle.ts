/** Routes whose main content ends with a terminal mobile sticky settle gap. */
export function isMobileTerminalStickySettlePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/account') return true;
  if (pathname === '/help' || pathname.startsWith('/help/')) return true;
  return false;
}

/** Keep in sync with `isMobileTerminalStickySettlePath` (DocumentBootScripts). */
export const MOBILE_TERMINAL_STICKY_SETTLE_BOOT_SCRIPT =
  '(function(){var p=location.pathname;if(p==="/account"||p==="/help"||p.indexOf("/help/")===0){document.documentElement.classList.add("mobile-terminal-sticky-settle");}})();';
