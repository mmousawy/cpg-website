import StickyScrollHeader from '@/components/layout/StickyScrollHeader';
import HelpLink from '@/components/shared/HelpLink';

type MembersPageHeaderProps = {
  description?: string;
};

export default function MembersPageHeader({
  description = 'Explore members by interests, recent activity, and photo styles',
}: MembersPageHeaderProps) {
  return (
    <>
      <StickyScrollHeader>
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">
            Discover our community
          </h1>
          <HelpLink
            href="discover-members"
            label="Help with discovering members"
            size="lg"
            className="max-sm:m-0"
          />
        </div>
      </StickyScrollHeader>
      <p className="mb-8 mt-1 text-base sm:text-lg opacity-80">
        {description}
      </p>
    </>
  );
}
