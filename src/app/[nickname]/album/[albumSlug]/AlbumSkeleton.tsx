import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';

export default function AlbumSkeleton() {
  return (
    <>
      <PageContainer className="!pb-0">
        {/* Content Header Skeleton */}
        <div className="animate-pulse">
          {/* Avatar and author info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-full bg-background-light" />
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-background-light" />
              <div className="h-3 w-16 rounded bg-background-light" />
            </div>
          </div>

          {/* Title */}
          <div className="h-8 w-3/4 rounded bg-background-light mb-3" />

          {/* Description */}
          <div className="space-y-2 mb-4">
            <div className="h-4 w-full rounded bg-background-light" />
            <div className="h-4 w-2/3 rounded bg-background-light" />
          </div>

          {/* Metadata */}
          <div className="h-4 w-20 rounded bg-background-light" />
        </div>

        {/* Button skeleton */}
        <div className="mt-4 h-8 w-32 rounded bg-background-light animate-pulse" />
      </PageContainer>

      {/* Gallery Skeleton */}
      <WidePageContainer>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-background-light"
            />
          ))}
        </div>
      </WidePageContainer>

      {/* Comments Skeleton */}
      <PageContainer variant="alt" className="border-t border-t-border-color">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded bg-background-light" />
          <div className="h-20 w-full rounded bg-background-light" />
        </div>
      </PageContainer>
    </>
  );
}
