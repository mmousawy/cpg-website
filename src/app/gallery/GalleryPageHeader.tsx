import HelpLink from '@/components/shared/HelpLink';

export default function GalleryPageHeader() {
  return (
    <div
      className="mb-8"
    >
      <div
        className="flex items-center gap-2 mb-2"
      >
        <h1
          className="text-2xl sm:text-3xl font-bold font-heading"
        >
          Photography gallery
        </h1>
        <HelpLink
          href="photos"
          label="Help with photos and gallery"
          size="lg"
        />
      </div>
      <p
        className="text-base sm:text-lg opacity-80"
      >
        Explore beautiful photos from the community
      </p>
    </div>
  );
}
