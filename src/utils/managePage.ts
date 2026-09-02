/** Paths that use the full-viewport manage photos/albums shell. */
export const MANAGE_PAGE_PATHS = ['/account/photos', '/account/albums'] as const;

export function isManagePagePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return MANAGE_PAGE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Injected into the document head before paint (see DocumentBootScripts)
 * so a hard load of a manage page gets `html.manage-page` without waiting
 * for hydration. Keep this in sync with `isManagePagePath`.
 */
export const MANAGE_PAGE_BOOT_SCRIPT = `(function(){var p=location.pathname;var a=${JSON.stringify(MANAGE_PAGE_PATHS)};for(var i=0;i<a.length;i++){if(p===a[i]||p.indexOf(a[i]+"/")===0){document.documentElement.classList.add("manage-page");break;}}})();`;
