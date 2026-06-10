import {
  AlbumsIcon,
  ChallengePhotosAcceptedIcon,
  ChallengesParticipatedIcon,
  CommentsMadeIcon,
  CommentsReceivedIcon,
  EventsAttendedIcon,
  LikesReceivedIcon,
  MemberSinceIcon,
  PhotosIcon,
  ViewsReceivedIcon,
} from '@/components/icons/profile-stats';

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
  const getOrdinalSuffix = (day: number) => {
    if (day >= 11 && day <= 13) {
      return 'th';
    }

    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };
  const memberSinceDate = stats.memberSince ? new Date(stats.memberSince) : null;

  // For badge value - show "MMM YYYY" (e.g. "Jan 2020") if valid date, otherwise null to skip badge
  const hasValidMemberSinceDate = !!memberSinceDate && !Number.isNaN(memberSinceDate.getTime());
  const memberSinceValue = hasValidMemberSinceDate
    ? memberSinceDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
    : null;

  // For tooltip - show full date with ordinal suffix (e.g. "January 1st, 2020")
  const memberSinceExactDate = hasValidMemberSinceDate
    ? `${memberSinceDate.toLocaleDateString('en-US', { month: 'long' })} ${memberSinceDate.getDate()}${getOrdinalSuffix(memberSinceDate.getDate())} ${memberSinceDate.getFullYear()}`
    : null;

  if (memberSinceValue && memberSinceExactDate) {
    badges.push({
      icon: (
        <MemberSinceIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: memberSinceValue,
      label: 'Member since',
      title: memberSinceExactDate,
    });
  }

  if (stats.photos > 0) {
    badges.push({
      icon: (
        <PhotosIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.photos.toLocaleString(),
      label: stats.photos === 1 ? 'Photo' : 'Photos',
    });
  }

  if (stats.albums > 0) {
    badges.push({
      icon: (
        <AlbumsIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.albums.toLocaleString(),
      label: stats.albums === 1 ? 'Album' : 'Albums',
    });
  }

  if (stats.eventsAttended > 0) {
    badges.push({
      icon: (
        <EventsAttendedIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.eventsAttended.toLocaleString(),
      label: stats.eventsAttended === 1 ? 'Event' : 'Events',
      suffix: ' attended',
    });
  }

  if (stats.commentsMade > 0) {
    badges.push({
      icon: (
        <CommentsMadeIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.commentsMade.toLocaleString(),
      label: stats.commentsMade === 1 ? 'Comment' : 'Comments',
      suffix: ' made',
    });
  }

  if (stats.commentsReceived > 0) {
    badges.push({
      icon: (
        <CommentsReceivedIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.commentsReceived.toLocaleString(),
      label: stats.commentsReceived === 1 ? 'Comment' : 'Comments',
      suffix: ' received',
    });
  }

  if (stats.likesReceived > 0) {
    badges.push({
      icon: (
        <LikesReceivedIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.likesReceived.toLocaleString(),
      label: stats.likesReceived === 1 ? 'Like' : 'Likes',
      suffix: ' received',
    });
  }

  if (stats.viewsReceived > 0) {
    badges.push({
      icon: (
        <ViewsReceivedIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.viewsReceived.toLocaleString(),
      label: stats.viewsReceived === 1 ? 'View' : 'Views',
      suffix: ' received',
    });
  }

  if (stats.challengesParticipated && stats.challengesParticipated > 0) {
    badges.push({
      icon: (
        <ChallengesParticipatedIcon
          className="size-8 text-primary"
          aria-hidden
        />
      ),
      value: stats.challengesParticipated.toLocaleString(),
      label: stats.challengesParticipated === 1 ? 'Challenge' : 'Challenges',
      suffix: ' participated in',
    });
  }

  if (stats.challengePhotosAccepted && stats.challengePhotosAccepted > 0) {
    badges.push({
      icon: (
        <ChallengePhotosAcceptedIcon
          className="size-8 text-primary"
          aria-hidden
        />
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
        className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-3 md:mx-0 md:grid md:grid-cols-5 md:gap-3 md:overflow-visible md:px-0 md:pb-0"
      >
        {badges.map((badge, index) => (
          <div
            key={index}
            title={badge.title}
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
