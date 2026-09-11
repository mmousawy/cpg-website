import StickyScrollHeader from '@/components/layout/StickyScrollHeader';
import AddSceneEventButton from '@/components/scene/AddSceneEventButton';
import HelpLink from '@/components/shared/HelpLink';

export default function ScenePageHeader() {
  return (
    <>
      <StickyScrollHeader>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading">
              Explore the scene
            </h1>
            <HelpLink
              href="what-is-scene"
              label="What is Scene?"
              size="lg"
              className="max-sm:m-0"
            />
          </div>
          <AddSceneEventButton />
        </div>
      </StickyScrollHeader>
      <p className="mb-8 mt-1 text-base sm:text-lg text-foreground/80">
        A community-curated guide to photography events.
        <br />
        Added by members, for members.
      </p>
    </>
  );
}
