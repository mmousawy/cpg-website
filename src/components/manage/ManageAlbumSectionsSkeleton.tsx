import AlbumGridSkeleton from '@/components/album/AlbumGridSkeleton';

function SectionHeaderSkeleton({ borderTop }: { borderTop?: boolean }) {
  return (
    <div
      className={`flex w-full items-center justify-between gap-2 px-4 py-4 sm:px-6 ${borderTop ? 'border-t border-border-color-strong' : ''}`}
    >
      <div
        className="h-4 w-36 animate-pulse rounded bg-background-medium"
      />
      <div
        className="size-4 animate-pulse rounded bg-background-medium"
      />
    </div>
  );
}

/**
 * Skeleton for the albums manage page section layout.
 */
export default function ManageAlbumSectionsSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      aria-busy="true"
      aria-label="Loading albums"
    >
      <SectionHeaderSkeleton />
      <div
        className="p-3 md:p-6"
      >
        <AlbumGridSkeleton
          count={8}
          className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]"
        />
      </div>

      <SectionHeaderSkeleton
        borderTop
      />
      <SectionHeaderSkeleton
        borderTop
      />
      <SectionHeaderSkeleton
        borderTop
      />
    </div>
  );
}
