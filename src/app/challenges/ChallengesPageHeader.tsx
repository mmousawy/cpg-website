import PageHeading from '@/components/layout/PageHeading';
import SectionSubtabs from '@/components/layout/SectionSubtabs';
import HelpLink from '@/components/shared/HelpLink';
import { gallerySectionSubtabs } from '@/lib/sectionSubtabs';

export default function ChallengesPageHeader() {
  return (
    <PageHeading
      title="Photo challenges"
      subnav={<SectionSubtabs items={gallerySectionSubtabs} />}
      description="Join our themed challenges and showcase your photography skills"
      aside={
        <HelpLink
          href="how-challenges-work"
          label="How photo challenges work"
          size="lg"
          className="max-sm:m-0"
        />
      }
    />
  );
}
