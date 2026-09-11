import StickyScrollHeader from '@/components/layout/StickyScrollHeader';
import HelpLink from '@/components/shared/HelpLink';

export default function GalleryPageHeader() {
  return (
    <>
      <StickyScrollHeader>
        <div className="mx-auto flex w-full max-w-screen-md items-center justify-center gap-2 sm:justify-start">
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">
            Photography gallery
          </h1>
          <HelpLink
            href="photos"
            label="Help with photos and gallery"
            size="lg"
            className="max-sm:m-0"
          />
        </div>
      </StickyScrollHeader>
      <p className="mx-auto mb-8 mt-1 w-full max-w-screen-md text-base sm:text-lg opacity-80">
        Explore beautiful photos from the community
      </p>
    </>
  );
}
