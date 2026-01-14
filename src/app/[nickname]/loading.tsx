import PageContainer from '@/components/layout/PageContainer';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-foreground/10 ${className}`} />;
}

export default function ProfileLoading() {
  return (
    <PageContainer>
      {/* Profile Header */}
      <div className="mb-8 sm:mb-10">
        {/* Avatar and Name */}
        <div className="mb-3 sm:mb-6 flex items-center gap-3 sm:gap-4">
          <Skeleton className="h-20 w-20 sm:h-26 sm:w-26 rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-7 sm:h-9 w-48 rounded mb-2" />
            <Skeleton className="h-5 sm:h-6 w-32 rounded" />
          </div>
        </div>

        {/* Bio skeleton */}
        <div className="space-y-2 max-w-[50ch]">
          <Skeleton className="h-5 w-full rounded" />
          <Skeleton className="h-5 w-3/4 rounded" />
        </div>
      </div>

      {/* Stats badges skeleton */}
      <div className="flex flex-wrap gap-2 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-6 w-32 rounded" />
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
