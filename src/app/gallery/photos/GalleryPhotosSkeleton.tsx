import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import JustifiedPhotoGridSkeleton from '@/components/photo/JustifiedPhotoGridSkeleton';

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-background-medium ${className ?? ''}`}
    />
  );
}

export default function GalleryPhotosSkeleton() {
  return (
    <>
      <PageContainer>
        <div>
          <SkeletonBar
            className="mb-2 h-9 w-56"
          />
          <SkeletonBar
            className="h-5 w-80 max-w-full"
          />
        </div>
      </PageContainer>

      <WidePageContainer
        className="pt-0!"
      >
        <div
          className="mb-6 flex gap-2"
        >
          <SkeletonBar
            className="h-9 w-24 rounded-full border border-border-color-strong"
          />
          <SkeletonBar
            className="h-9 w-24 rounded-full border border-border-color-strong"
          />
        </div>

        <JustifiedPhotoGridSkeleton
          rows={5}
        />
      </WidePageContainer>
    </>
  );
}
