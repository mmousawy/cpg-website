import PageHeading from '@/components/layout/PageHeading';
import SectionSubtabs from '@/components/layout/SectionSubtabs';
import AddSceneEventButton from '@/components/scene/AddSceneEventButton';
import HelpLink from '@/components/shared/HelpLink';
import { eventsSectionSubtabs } from '@/lib/sectionSubtabs';

export default function ScenePageHeader() {
  return (
    <PageHeading
      title="Scene"
      subnav={<SectionSubtabs items={eventsSectionSubtabs} />}
      description={
        <>
          A community-curated guide to photography events.
          <br />
          Added by members, for members.
        </>
      }
      aside={
        <HelpLink
          href="what-is-scene"
          label="What is Scene?"
          size="lg"
          className="max-sm:m-0"
        />
      }
      actions={<AddSceneEventButton />}
    />
  );
}
