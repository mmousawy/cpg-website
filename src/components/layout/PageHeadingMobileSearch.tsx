'use client';

/** Opens the global search overlay (see `SiteSearch` `search:open` listener). */
export default function PageHeadingMobileSearch() {
  return (
    <button
      type="button"
      aria-label="Search"
      className="flex shrink-0 items-center justify-center rounded-full p-2 text-foreground/80 transition-colors hover:text-foreground"
      onPointerDown={() => {
        window.dispatchEvent(new CustomEvent('search:intent'));
      }}
      onClick={() => {
        window.dispatchEvent(new CustomEvent('search:open'));
      }}
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
