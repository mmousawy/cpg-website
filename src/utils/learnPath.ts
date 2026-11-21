export const LEARN_PAGE_CLASS = 'learn-page';

export function isLearnCatalogPath(pathname: string) {
  return pathname === '/learn';
}

export function isLearnDeckPath(pathname: string) {
  return pathname.startsWith('/learn/') && pathname.length > '/learn/'.length;
}

/** Any Learn route: catalog redirect or lesson deck. */
export function isLearnPagePath(pathname: string) {
  return isLearnCatalogPath(pathname) || isLearnDeckPath(pathname);
}

export const LEARN_PAGE_BOOT_SCRIPT = `(function(){var p=location.pathname;if(p==="/learn"||(p.indexOf("/learn/")===0&&p.length>7)){document.documentElement.classList.add("${LEARN_PAGE_CLASS}");}})();`;
