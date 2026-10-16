import StickySectionHeading from '@/components/layout/StickySectionHeading';
import TagCloudSkeleton from '@/components/shared/TagCloudSkeleton';

const PILL_WIDTHS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const INTEREST_LABEL_WIDTHS = [52, 90, 64, 84, 70, 50, 50, 56, 44, 64, 56, 70, 48, 68, 52, 84];
export default function MembersDiscoverySkeleton() {
  return (
    <>
      <div
        className="mb-10"
      >
        <StickySectionHeading
          stickyClassName="mb-3 sm:mb-3"
        >
          Popular interests
        </StickySectionHeading>
        <InterestCloudSkeleton />
      </div>
      <div
        className="mb-10"
      >
        <StickySectionHeading
          stickyClassName="mb-4 sm:mb-4"
        >
          Explore by interests
        </StickySectionHeading>
        <InterestCardsSkeleton />
      </div>
      <div
        className="mb-10"
      >
        <StickySectionHeading
          stickyClassName="mb-1 sm:mb-1"
        >
          Shoots on
        </StickySectionHeading>
        <p
          className="mb-6 text-sm text-foreground/60"
        >
          Find members by how they shoot — digital, film, phone, and more
        </p>
        <InterestCloudSkeleton />
      </div>
      <div
        className="mb-10"
      >
        <StickySectionHeading
          stickyClassName="mb-1 sm:mb-1"
        >
          Daily drivers
        </StickySectionHeading>
        <p
          className="mb-6 text-sm text-foreground/60"
        >
          Popular camera bodies and lenses members reach for most often
        </p>
        <InterestCloudSkeleton />
      </div>
      <div
        className="mb-10"
      >
        <StickySectionHeading
          stickyClassName="mb-1 sm:mb-1"
        >
          Recently active
        </StickySectionHeading>
        <p
          className="mb-6 text-sm text-foreground/60"
        >
          Members who have shared photos or albums recently
        </p>
        <MemberGridSkeleton
          count={8}
        />
      </div>
      <div
        className="mb-10"
      >
        <StickySectionHeading
          stickyClassName="mb-1 sm:mb-1"
        >
          Explore by photo style
        </StickySectionHeading>
        <p
          className="mb-6 text-sm text-foreground/60"
        >
          Discover members who frequently use these photo tags
        </p>
        <TagCloudSkeleton />
      </div>
      <div>
        <StickySectionHeading
          stickyClassName="mb-1 sm:mb-1"
        >
          New members
        </StickySectionHeading>
        <p
          className="mb-6 text-sm text-foreground/60"
        >
          Welcome our newest community members
        </p>
        <MemberGridSkeleton
          count={8}
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
      className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4"
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
      className="flex flex-wrap items-baseline gap-2"
      aria-busy="true"
      aria-label="Loading interests"
    >
      {INTEREST_LABEL_WIDTHS.map((width, index) => (
        <div
          key={index}
          className="inline-flex min-h-6 animate-pulse items-center rounded-full border border-transparent bg-white px-2 pb-0.5 pr-1 shadow-sm sm:min-h-7 dark:bg-white/15"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div
            className="h-3.5 shrink-0 rounded-full bg-foreground/15 sm:h-4"
            style={{ width }}
          />
          <div
            className="ml-1.5 mt-px size-4 shrink-0 rounded-full bg-black/10 sm:size-5 dark:bg-background/50"
          />
        </div>
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
            className="flex items-center gap-3 mb-3 h-5"
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
