import PageHeading from '@/components/layout/PageHeading';
import SectionSubtabs from '@/components/layout/SectionSubtabs';
import HelpLink from '@/components/shared/HelpLink';
import { eventsSectionSubtabs } from '@/lib/sectionSubtabs';

export default function EventsPageHeader() {
  return (
    <PageHeading
      title="Events"
      subnav={<SectionSubtabs items={eventsSectionSubtabs} />}
      description="Join our upcoming meetups or explore past events"
      aside={
        <HelpLink
          href="join-events"
          label="How to find and join events"
          size="lg"
          className="max-sm:m-0"
        />
      }
    />
  );
}
