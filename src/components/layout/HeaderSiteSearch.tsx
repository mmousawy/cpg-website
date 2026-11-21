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
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-background-medium hover:text-foreground"
      aria-label="Search"
    >
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className="size-5"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </button>
  );
}
