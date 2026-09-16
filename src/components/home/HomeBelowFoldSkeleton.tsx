import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-background-medium ${className ?? ''}`}
    />
  );
}

/**
 * Placeholder for the homepage below the hero while `getIncludeTestContent()` resolves.
 * Must not render real cached content — that caused duplicate sections on production.
 */
export function HomeBelowFoldSkeleton() {
  return (
    <div
      className="grid min-w-0 gap-10 md:gap-12 py-10 md:py-12 [&>*]:min-w-0"
      aria-busy="true"
      aria-label="Loading homepage"
    >
      <PageContainer
        className="py-0!"
        innerClassName="grid gap-10 md:gap-12"
      >
        <div>
          <SkeletonBar
            className="mb-4 h-7 w-48"
          />
          <SkeletonBar
            className="h-40 w-full rounded-xl"
          />
        </div>
        <div>
          <SkeletonBar
            className="mb-4 h-7 w-44"
          />
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBar
                key={i}
                className="aspect-16/10 rounded-xl"
              />
            ))}
          </div>
        </div>
      </PageContainer>

      <PageContainer
        className="py-0!"
      >
        <SkeletonBar
          className="mb-4 h-7 w-40"
        />
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBar
              key={i}
              className="aspect-4/3"
            />
          ))}
        </div>
      </PageContainer>

      <WidePageContainer
        className="py-0!"
      >
        <SkeletonBar
          className="mb-4 h-7 w-36"
        />
        <JustifiedPhotoGridSkeletonPlaceholder />
      </WidePageContainer>

      <PageContainer
        className="py-0!"
      >
        <Container>
          <SkeletonBar
            className="mb-4 h-8 w-72 max-w-full"
          />
          <SkeletonBar
            className="mb-2 h-4 w-full max-w-[50ch]"
          />
          <SkeletonBar
            className="h-4 w-full max-w-[45ch]"
          />
        </Container>
      </PageContainer>
    </div>
  );
}

function JustifiedPhotoGridSkeletonPlaceholder() {
  return (
    <div
      className="flex flex-col gap-1"
    >
      <div
        className="flex gap-1"
      >
        <SkeletonBar
          className="h-28 flex-1"
        />
        <SkeletonBar
          className="h-28 flex-1"
        />
      </div>
      <div
        className="flex gap-1"
      >
        <SkeletonBar
          className="h-32 flex-[1.2]"
        />
        <SkeletonBar
          className="h-32 flex-1"
        />
        <SkeletonBar
          className="h-32 flex-[0.8]"
        />
      </div>
    </div>
  );
}
