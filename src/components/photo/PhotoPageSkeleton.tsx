import LoadingSpinner from '@/components/shared/LoadingSpinner';

function SkeletonBar({
  className,
}: {
  className: string;
}) {
  return (
    <div
      className={`animate-pulse rounded bg-foreground/10 ${className}`}
    />
  );
}

function SkeletonMetadataRow({ lineClassName }: { lineClassName: string }) {
  return (
    <div
      className="flex items-center gap-1.5"
    >
      <SkeletonBar
        className="size-4 shrink-0 rounded-sm"
      />
      <SkeletonBar
        className={`h-3 ${lineClassName}`}
      />
    </div>
  );
}

function SkeletonCommentRow() {
  return (
    <div
      className="flex gap-2.5"
    >
      <SkeletonBar
        className="size-8 shrink-0 rounded-full"
      />
      <div
        className="flex-1 space-y-1.5 pt-0.5"
      >
        <SkeletonBar
          className="h-3 w-24"
        />
        <SkeletonBar
          className="h-3 w-full"
        />
        <SkeletonBar
          className="h-3 w-4/5"
        />
      </div>
    </div>
  );
}

export default function PhotoPageSkeleton() {
  return (
    <div
      className="w-full px-4 pt-4 md:flex md:gap-4 md:p-4 md:items-stretch lg:p-8 lg:gap-8"
    >
      <div
        className="md:flex-1 md:sticky md:self-start md:top-[90px] md:h-[calc(100vh-106px)] lg:top-[106px] lg:h-[calc(100vh-138px)] md:flex md:flex-col"
      >
        <div
          className="flex min-h-[40vh] flex-1 items-center justify-center md:min-h-0"
          role="status"
          aria-label="Loading photo"
        >
          <LoadingSpinner
            size="lg"
          />
        </div>
      </div>

      <div
        className="relative mt-4 -mx-4 border-t border-t-border-color bg-background-light px-4 pt-4 pb-8 md:mx-0 md:mt-0 md:flex md:w-96 md:shrink-0 md:flex-col md:rounded-lg md:border md:border-border-color md:px-6 md:pt-6 md:pb-6 lg:w-lg"
      >
        <SkeletonBar
          className="absolute top-4 right-4 size-8 rounded-full md:top-6 md:right-6"
        />

        <div
          className="mb-6 flex items-center gap-2.5"
        >
          <SkeletonBar
            className="size-10 shrink-0 rounded-full"
          />
          <div
            className="space-y-1.5"
          >
            <SkeletonBar
              className="h-3.5 w-28"
            />
            <SkeletonBar
              className="h-3 w-20"
            />
          </div>
        </div>

        <div
          className="mb-6 space-y-3"
        >
          <SkeletonBar
            className="h-7 w-3/4"
          />
          <SkeletonBar
            className="h-3.5 w-full"
          />
          <SkeletonBar
            className="h-3.5 w-5/6"
          />
        </div>

        <div
          className="mt-auto space-y-2 pt-4"
        >
          <SkeletonMetadataRow
            lineClassName="w-32"
          />
          <SkeletonMetadataRow
            lineClassName="w-48"
          />
          <SkeletonMetadataRow
            lineClassName="w-36"
          />
        </div>

        <div
          className="mt-6 space-y-3 border-t border-border-color pt-6"
        >
          <SkeletonBar
            className="h-8 w-20 rounded-full"
          />
          <div
            className="space-y-4 pt-1"
          >
            <SkeletonCommentRow />
            <SkeletonCommentRow />
          </div>
        </div>
      </div>
    </div>
  );
}
