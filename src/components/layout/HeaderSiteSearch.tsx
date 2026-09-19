'use client';

/** Desktop header trigger for the global search overlay (`SiteSearch`). */
export default function HeaderSiteSearch() {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent('search:open'));
      }}
      onMouseEnter={() => {
        window.dispatchEvent(new CustomEvent('search:intent'));
      }}
      onFocus={() => {
        window.dispatchEvent(new CustomEvent('search:intent'));
      }}
      className="flex items-center justify-center gap-2 rounded-full p-2 text-foreground/80 transition-colors hover:text-foreground lg:rounded-lg lg:border lg:border-border-color lg:bg-background-medium lg:px-2 lg:py-1.5 lg:text-sm lg:hover:border-primary"
      aria-label="Search"
    >
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className="size-5 lg:size-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span className="hidden lg:inline text-foreground/60">Search</span>
      <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border-color bg-background px-1.5 font-mono text-xs font-medium text-foreground/50 [word-spacing:-0.25em]">
        <span className="hidden in-data-[platform=mac]:inline">⌘</span>
        <span className="inline in-data-[platform=mac]:hidden">Ctrl</span>
        {' + '}
        K
      </kbd>
    </button>
  );
}
