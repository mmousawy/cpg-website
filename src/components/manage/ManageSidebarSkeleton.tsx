/**
 * Skeleton for the manage sidebar empty/edit panel.
 */
export default function ManageSidebarSkeleton() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center bg-background-light p-10 text-center"
      aria-busy="true"
      aria-label="Loading sidebar"
    >
      <div
        className="mb-2 size-10 animate-pulse rounded bg-foreground/10"
      />
      <div
        className="mb-2 h-6 w-48 animate-pulse rounded bg-foreground/10"
      />
      <div
        className="h-4 w-56 animate-pulse rounded bg-foreground/10"
      />
    </div>
  );
}
