import StickyScrollHeader from '@/components/layout/StickyScrollHeader';
import HelpLink from '@/components/shared/HelpLink';

export default function EventsPageHeader() {
  return (
    <>
      <StickyScrollHeader>
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">
            Events
          </h1>
          <HelpLink
            href="join-events"
            label="How to find and join events"
            size="lg"
            className="max-sm:m-0"
          />
        </div>
      </StickyScrollHeader>
      <p className="mb-8 mt-1 text-base sm:text-lg opacity-80">
        Join our upcoming meetups or explore past events
      </p>
    </>
  );
}
