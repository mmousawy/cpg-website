import PageHeading from '@/components/layout/PageHeading';
import SectionSubtabs from '@/components/layout/SectionSubtabs';
import HelpLink from '@/components/shared/HelpLink';
import { gallerySectionSubtabs } from '@/lib/sectionSubtabs';

export default function GalleryPageHeader() {
  return (
    <PageHeading
      className="mx-auto w-full max-w-screen-md"
      title="Photo gallery"
      subnav={<SectionSubtabs items={gallerySectionSubtabs} />}
      description="Explore beautiful photos from the community"
      aside={
        <HelpLink
          href="photos"
          label="Help with photos and gallery"
          size="lg"
          className="max-sm:m-0"
        />
      }
    />
  );
}
