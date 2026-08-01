import { Fragment } from 'react';

import TagCloudSkeleton from '@/components/shared/TagCloudSkeleton';

const PILL_WIDTHS = [80, 100, 68, 112, 76, 96, 88, 104, 72, 92, 84, 108, 76, 96, 80, 112, 68, 100, 88, 72];
export default function MembersDiscoverySkeleton() {
  return (
    <>
      <div
        className="mb-10"
      >
        <h2
          className="mb-3 text-xl font-semibold font-heading opacity-80"
        >
          Popular interests
        </h2>
        <InterestCloudSkeleton />
      </div>
      <div
        className="mb-10"
      >
        <h2
          className="mb-4 text-xl font-semibold font-heading opacity-80"
        >
          Explore by interests
        </h2>
        <InterestCardsSkeleton />
      </div>
      <div
        className="mb-10"
      >
        <h2
          className="mb-1 text-xl font-semibold font-heading opacity-80"
        >
          Recently active
        </h2>
        <p
          className="mb-6 text-sm text-foreground/60"
        >
          Members who have shared photos or albums recently
        </p>
        <MemberGridSkeleton
          count={12}
        />
      </div>
      <div
        className="mb-10"
      >
        <h2
          className="mb-1 text-xl font-semibold font-heading opacity-80"
        >
          Explore by photo style
        </h2>
        <p
          className="mb-6 text-sm text-foreground/60"
        >
          Discover members who frequently use these photo tags
        </p>
        <TagCloudSkeleton />
      </div>
      <div>
        <h2
          className="mb-1 text-xl font-semibold font-heading opacity-80"
        >
          New members
        </h2>
        <p
          className="mb-6 text-sm text-foreground/60"
        >
          Welcome our newest community members
        </p>
        <MemberGridSkeleton
          count={12}
        />
      </div>
    </>
  );
}

function MemberCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="animate-pulse rounded-lg border border-border-color bg-background-light px-2 py-3 flex flex-col items-center gap-2"
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <div
        className="size-16 rounded-full bg-background-medium"
      />
      <div
        className="w-full flex flex-col items-center"
      >
        <div
          className="h-4.5 bg-background-medium rounded w-3/4 mb-0.5"
        />
        <div
          className="h-4 bg-background-medium rounded w-1/2"
        />
        <div
          className="h-4 bg-background-medium rounded w-2/3 mt-2"
        />
      </div>
    </div>
  );
}

function MemberGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <MemberCardSkeleton
          key={i}
          index={i}
        />
      ))}
    </div>
  );
}

function InterestCloudSkeleton() {
  return (
    <div
      className="flex flex-wrap items-center gap-y-1"
    >
      {PILL_WIDTHS.map((w, i) => (
        <Fragment
          key={i}
        >
          {i > 0 && (
            <span
              className="mx-2 sm:mx-2.5 text-sm sm:text-base opacity-50 select-none"
              aria-hidden
            >
              ·
            </span>
          )}
          <div
            className="h-4 sm:h-5 shrink-0 animate-pulse rounded bg-background-medium"
            style={{ width: w, animationDelay: `${i * 50}ms` }}
          />
        </Fragment>
      ))}
    </div>
  );
}

function InterestCardsSkeleton() {
  return (
    <div
      className="grid gap-3 xs:grid-cols-2 md:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-border-color bg-background-light px-4 py-3"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div
            className="flex items-center gap-3 mb-3 h-6"
          >
            <div
              className="h-5 rounded bg-background-medium"
              style={{ width: PILL_WIDTHS[i % PILL_WIDTHS.length] }}
            />
            <div
              className="h-4 w-16 rounded bg-background-medium"
            />
          </div>
          <div
            className="flex -space-x-2"
          >
            {Array.from({ length: 4 }).map((_, j) => (
              <div
                key={j}
                className="size-12 rounded-full bg-background-medium ring-2 ring-background-light"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
