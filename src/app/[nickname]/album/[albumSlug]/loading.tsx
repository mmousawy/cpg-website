import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-foreground/10 ${className}`} style={style} />;
}

export default function AlbumLoading() {
  return (
    <>
      <PageContainer className="!pb-0">
        {/* Header skeleton */}
        <div className="mb-6">
          <Skeleton className="h-8 w-64 rounded mb-2" />
          <Skeleton className="h-5 w-96 max-w-full rounded mb-4" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 rounded mb-1" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Gallery skeleton */}
      <WidePageContainer>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-square rounded"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </WidePageContainer>
    </>
  );
}
