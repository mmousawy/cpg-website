import PageHeading from '@/components/layout/PageHeading';
import HelpLink from '@/components/shared/HelpLink';

type MembersPageHeaderProps = {
  description?: string;
};

export default function MembersPageHeader({
  description = 'Explore members by interests, recent activity, and photo styles',
}: MembersPageHeaderProps) {
  return (
    <PageHeading
      title="Members"
      description={description}
      aside={
        <HelpLink
          href="discover-members"
          label="Help with discovering members"
          size="lg"
          className="max-sm:m-0"
        />
      }
    />
  );
}
