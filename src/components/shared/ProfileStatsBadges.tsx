type ProfileStats = {
  photos: number;
  albums: number;
  eventsAttended: number;
  commentsMade: number;
  commentsReceived: number;
  likesReceived: number;
  viewsReceived: number;
  memberSince: string | null;
};

type ProfileStatsBadgesProps = {
  stats: ProfileStats;
};

export default function ProfileStatsBadges({ stats }: ProfileStatsBadgesProps) {
  const badges = [];

  if (stats.memberSince) {
    badges.push({
      icon: (
        <svg
          className="size-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
      value: new Date(stats.memberSince).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      label: 'Member since',
    });
  }

  if (stats.photos > 0) {
    badges.push({
      icon: (
        <svg
          className="size-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      value: stats.photos.toLocaleString(),
      label: stats.photos === 1 ? 'Photo' : 'Photos',
    });
  }

  if (stats.albums > 0) {
    badges.push({
      icon: (
        <svg
          className="size-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
      value: stats.albums.toLocaleString(),
      label: stats.albums === 1 ? 'Album' : 'Albums',
    });
  }

  if (stats.eventsAttended > 0) {
    badges.push({
      icon: (
        <svg
          className="size-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      value: stats.eventsAttended.toLocaleString(),
      label: stats.eventsAttended === 1 ? 'Event' : 'Events',
      suffix: ' attended',
    });
  }

  if (stats.commentsMade > 0) {
    badges.push({
      icon: (
        <svg
          className="size-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      value: stats.commentsMade.toLocaleString(),
      label: stats.commentsMade === 1 ? 'Comment' : 'Comments',
      suffix: ' made',
    });
  }

  if (stats.commentsReceived > 0) {
    badges.push({
      icon: (
        <svg
          className="size-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
      ),
      value: stats.commentsReceived.toLocaleString(),
      label: stats.commentsReceived === 1 ? 'Comment' : 'Comments',
      suffix: ' received',
    });
  }

  if (stats.likesReceived > 0) {
    badges.push({
      icon: (
        <svg
          className="size-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
      value: stats.likesReceived.toLocaleString(),
      label: stats.likesReceived === 1 ? 'Like' : 'Likes',
      suffix: ' received',
    });
  }

  if (stats.viewsReceived > 0) {
    badges.push({
      icon: (
        <svg
          className="size-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      ),
      value: stats.viewsReceived.toLocaleString(),
      label: stats.viewsReceived === 1 ? 'View' : 'Views',
      suffix: ' received',
    });
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="">
      <h2 className="mb-4 text-md font-semibold opacity-70">Achievements</h2>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {badges.map((badge, index) => (
          <div
            key={index}
            className="badge-gradient rounded-md px-3 py-4 flex flex-col items-center text-center shadow-xl shadow-foreground/3 hover:shadow-primary/20 dark:hover:shadow-primary-alt/20 transition-all duration-300"
          >
            <div className="mb-2">
              <div className="size-6 sm:size-8 text-primary flex items-center justify-center">
                {badge.icon}
              </div>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground mb-0.5">{badge.value}</p>
            <p className="text-xs text-foreground/60 leading-tight">
              {badge.label}
              {badge.suffix && badge.suffix}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
