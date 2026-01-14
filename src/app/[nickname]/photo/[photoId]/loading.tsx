import PageContainer from '@/components/layout/PageContainer';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-foreground/10 ${className}`} />;
}

export default function PhotoLoading() {
  return (
    <PageContainer>
      {/* Photo skeleton */}
      <div className="max-w-4xl mx-auto">
        <Skeleton className="aspect-[4/3] w-full rounded-lg mb-6" />

        {/* Photo info */}
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-40 rounded mb-1" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </div>

        {/* Description */}
        <Skeleton className="h-4 w-full rounded mb-2" />
        <Skeleton className="h-4 w-2/3 rounded" />
      </div>
    </PageContainer>
  );
}
