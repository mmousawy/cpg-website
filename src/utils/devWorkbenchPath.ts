export const DEV_WORKBENCH_PAGE_CLASS = 'dev-workbench-page';

export function isStoryboardPath(pathname: string) {
  return pathname === '/dev/ui' || pathname.startsWith('/dev/ui/');
}

/** Dev-only email template previews (not end-user flows like `/email/changed`). */
export function isEmailPreviewWorkbenchPath(pathname: string) {
  if (pathname === '/email') return true;
  if (!pathname.startsWith('/email/')) return false;
  if (pathname === '/email/changed' || pathname.startsWith('/email/changed/')) {
    return false;
  }
  return true;
}

export function isDevWorkbenchPath(pathname: string) {
  return isStoryboardPath(pathname) || isEmailPreviewWorkbenchPath(pathname);
}

/** First-paint class so dev workbench shell CSS wins over mobile pinned shell before React hydrates. */
export const DEV_WORKBENCH_PAGE_BOOT_SCRIPT = `(function(){var p=location.pathname;var w=p==="/dev/ui"||p.indexOf("/dev/ui/")===0;var e=p==="/email"||(p.indexOf("/email/")===0&&p.indexOf("/email/changed")!==0);if(w||e){document.documentElement.classList.add("${DEV_WORKBENCH_PAGE_CLASS}");}})();`;
