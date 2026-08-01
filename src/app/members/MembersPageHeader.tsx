import HelpLink from '@/components/shared/HelpLink';

export default function MembersPageHeader() {
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
          Discover our community
        </h1>
        <HelpLink
          href="discover-members"
          label="Help with discovering members"
          size="lg"
        />
      </div>
      <p
        className="text-base sm:text-lg opacity-80"
      >
        Explore members by interests, recent activity, and photo styles
      </p>
    </div>
  );
}
