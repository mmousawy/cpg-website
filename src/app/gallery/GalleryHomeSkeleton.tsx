import AlbumGridSkeleton from '@/components/album/AlbumGridSkeleton';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import JustifiedPhotoGridSkeleton from '@/components/photo/JustifiedPhotoGridSkeleton';
import Container from '@/components/layout/Container';
import TagCloudSkeleton from '@/components/shared/TagCloudSkeleton';

import GalleryPageHeader from './GalleryPageHeader';

const ALBUM_GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 sm:gap-6';

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-background-medium ${className ?? ''}`}
    />
  );
}

function GallerySectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="mb-6"
    >
      <h2
        className="inline-block font-heading text-xl font-semibold"
      >
        {title}
      </h2>
      <p
        className="mt-1 text-sm text-foreground/80"
      >
        {description}
      </p>
    </div>
  );
}

function ButtonSkeleton({ className = 'w-44' }: { className?: string }) {
  return (
    <div
      className="mt-6 flex justify-center"
    >
      <SkeletonBar
        className={`h-[2.125rem] rounded-full border border-border-color-strong ${className}`}
      />
    </div>
  );
}

function SignUpCTASkeleton() {
  return (
    <Container
      className="mx-auto mt-10 max-w-screen-md bg-background-special"
    >
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div
          className="flex-1 space-y-2"
        >
          <SkeletonBar
            className="h-4 w-full max-w-md"
          />
          <SkeletonBar
            className="h-4 w-4/5 max-w-sm"
          />
        </div>
        <SkeletonBar
          className="h-[2.125rem] w-36 shrink-0 rounded-full"
        />
      </div>
    </Container>
  );
}

function PhotoSectionSkeleton({
  title,
  description,
  rows,
  buttonWidth = 'w-44',
}: {
  title: string;
  description: string;
  rows: number;
  buttonWidth?: string;
}) {
  return (
    <div
      className="mb-12"
    >
      <JustifiedPhotoGridSkeleton
        rows={rows}
        header={
          <GallerySectionHeader
            title={title}
            description={description}
          />
        }
      />
      <ButtonSkeleton
        className={buttonWidth}
      />
    </div>
  );
}

function AlbumSectionSkeleton({
  title,
  description,
  count,
  buttonWidth = 'w-44',
}: {
  title: string;
  description: string;
  count: number;
  buttonWidth?: string;
}) {
  return (
    <div
      className="mb-12"
    >
      <GallerySectionHeader
        title={title}
        description={description}
      />
      <AlbumGridSkeleton
        count={count}
        className={ALBUM_GRID_CLASS}
      />
      <ButtonSkeleton
        className={buttonWidth}
      />
    </div>
  );
}

function GalleryHomeContentSkeleton() {
  return (
    <>
      <PageContainer
        className="pt-0!"
      >
        <h2
          className="mb-3 font-heading text-xl font-semibold opacity-80"
        >
          Browse by tag
        </h2>
        <TagCloudSkeleton
          variant="gallery"
        />
      </PageContainer>

      <WidePageContainer
        className="pt-0!"
      >
        <PhotoSectionSkeleton
          title="Most viewed this week"
          description="Popular photos from the last 7 days"
          rows={2}
          buttonWidth="w-48"
        />

        <AlbumSectionSkeleton
          title="Trending albums"
          description="Most viewed albums from the last 7 days"
          count={5}
          buttonWidth="w-48"
        />

        <PhotoSectionSkeleton
          title="Recent photos"
          description="Latest uploads from the community"
          rows={2}
        />

        <div>
          <GallerySectionHeader
            title="Recent albums"
            description="Photo collections from community members"
          />
          <AlbumGridSkeleton
            count={6}
            className={ALBUM_GRID_CLASS}
          />
          <ButtonSkeleton />
        </div>

        <SignUpCTASkeleton />
      </WidePageContainer>
    </>
  );
}

/** Full gallery page skeleton for route loading (header + home sections). */
export default function GalleryHomeSkeleton() {
  return (
    <>
      <PageContainer>
        <GalleryPageHeader />
      </PageContainer>
      <GalleryHomeContentSkeleton />
    </>
  );
}
