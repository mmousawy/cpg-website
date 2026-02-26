type ProfileStats = {
  photos: number;
  albums: number;
  eventsAttended: number;
  commentsMade: number;
  commentsReceived: number;
  likesReceived: number;
  viewsReceived: number;
  memberSince: string | null;
  challengesParticipated?: number;
  challengePhotosAccepted?: number;
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

  if (stats.challengesParticipated && stats.challengesParticipated > 0) {
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
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
      value: stats.challengesParticipated.toLocaleString(),
      label: stats.challengesParticipated === 1 ? 'Challenge' : 'Challenges',
      suffix: ' participated in',
    });
  }

  if (stats.challengePhotosAccepted && stats.challengePhotosAccepted > 0) {
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
            d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
          />
        </svg>
      ),
      value: stats.challengePhotosAccepted.toLocaleString(),
      label: stats.challengePhotosAccepted === 1 ? 'Submission' : 'Submissions',
      suffix: 'in challenges',
    });
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <div>
      <h2
        className="mb-3 sm:mb-4 text-md font-semibold opacity-70"
      >
        Achievements
      </h2>
      {/* Mobile: break out of container for edge-to-edge scroll, Desktop: grid */}
      <div
        className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-3 md:mx-0 md:grid md:grid-cols-5 md:gap-3 md:overflow-visible md:px-0 md:pb-0"
      >
        {badges.map((badge, index) => (
          <div
            key={index}
            className="badge-gradient rounded-md shrink-0 px-3 py-2 sm:py-4 flex flex-col items-center text-center shadow-md sm:shadow-xl shadow-foreground/3 hover:shadow-primary/20 dark:hover:shadow-primary-alt/20 transition-all duration-300 min-w-20 max-w-25 sm:min-w-0 sm:max-w-none"
          >
            <div
              className="mb-1 sm:mb-2"
            >
              <div
                className="size-6 sm:size-8 text-primary flex items-center justify-center"
              >
                {badge.icon}
              </div>
            </div>
            <p
              className="text-sm sm:text-lg font-bold text-foreground mb-0.5"
            >
              {badge.value}
            </p>
            <p
              className="text-[10px] sm:text-xs text-foreground/60 leading-tight"
            >
              {badge.label}
              {badge.suffix && ` ${badge.suffix}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
