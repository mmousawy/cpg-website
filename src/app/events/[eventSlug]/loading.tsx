import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-foreground/10 ${className}`} />;
}

export default function EventDetailLoading() {
  return (
    <>
      {/* Hero skeleton */}
      <div className="relative h-[clamp(14rem,25svw,20rem)] w-full overflow-hidden bg-background-light">
        <Skeleton className="absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-0 sm:px-8 sm:pb-4">
          <div className="mx-auto max-w-screen-md">
            <Skeleton className="h-6 w-24 rounded-full mb-2" />
            <Skeleton className="h-10 w-72 rounded" />
          </div>
        </div>
      </div>

      <PageContainer className="!pt-6 sm:!pt-8">
        <Container>
          {/* Event info skeletons */}
          <div className="mb-8 space-y-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-6 w-24 rounded" />
            </div>
            <Skeleton className="h-6 w-64 rounded" />
          </div>

          {/* Description skeleton */}
          <div className="mb-8">
            <Skeleton className="h-6 w-40 rounded mb-3" />
            <div className="space-y-2 max-w-[50ch]">
              <Skeleton className="h-5 w-full rounded" />
              <Skeleton className="h-5 w-full rounded" />
              <Skeleton className="h-5 w-3/4 rounded" />
            </div>
          </div>

          {/* Hosts skeleton */}
          <div className="mb-8">
            <Skeleton className="h-6 w-20 rounded mb-3" />
            <div className="flex flex-wrap gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32 rounded mb-1" />
                    <Skeleton className="h-4 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attendees skeleton */}
          <div>
            <Skeleton className="h-6 w-24 rounded mb-3" />
            <div className="flex items-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full -mr-2" />
              ))}
              <Skeleton className="h-5 w-24 rounded ml-4" />
            </div>
          </div>
        </Container>
      </PageContainer>
    </>
  );
}
