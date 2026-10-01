export default function NotFoundQuickLinksFallback() {
  return (
    <div
      className="flex w-full max-w-xs flex-wrap justify-center gap-x-10 gap-y-4 sm:max-w-none sm:gap-x-5 sm:gap-y-2"
      aria-hidden
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-5 w-[calc(50%-1.25rem)] animate-pulse rounded bg-border-color/60 sm:w-16"
        />
      ))}
    </div>
  );
}
