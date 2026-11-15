'use client';

import {
  AlbumsIcon,
  ChallengePhotosAcceptedIcon,
  ChallengesParticipatedIcon,
  CommentsMadeIcon,
  CommentsReceivedIcon,
  EventsAttendedIcon,
  LikesGivenIcon,
  LikesReceivedIcon,
  MemberSinceIcon,
  PhotosIcon,
  ViewsReceivedIcon,
} from '@/components/icons/profile-stats';
import {
  BarChartIcon,
  LineChartIcon,
  ResetZoomIcon,
} from '@/components/icons/stats/StatsChartIcons';

import type { UiStoryFrame } from './types';

const iconClass = 'size-8 text-foreground';

const profileStatIcons: Array<{ name: string; icon: React.ReactNode }> = [
  { name: 'AlbumsIcon', icon: <AlbumsIcon
    className={iconClass}
  /> },
  { name: 'ChallengePhotosAcceptedIcon', icon: <ChallengePhotosAcceptedIcon
    className={iconClass}
  /> },
  { name: 'ChallengesParticipatedIcon', icon: <ChallengesParticipatedIcon
    className={iconClass}
  /> },
  { name: 'CommentsMadeIcon', icon: <CommentsMadeIcon
    className={iconClass}
  /> },
  { name: 'CommentsReceivedIcon', icon: <CommentsReceivedIcon
    className={iconClass}
  /> },
  { name: 'EventsAttendedIcon', icon: <EventsAttendedIcon
    className={iconClass}
  /> },
  { name: 'LikesGivenIcon', icon: <LikesGivenIcon
    className={iconClass}
  /> },
  { name: 'LikesReceivedIcon', icon: <LikesReceivedIcon
    className={iconClass}
  /> },
  { name: 'MemberSinceIcon', icon: <MemberSinceIcon
    className={iconClass}
  /> },
  { name: 'PhotosIcon', icon: <PhotosIcon
    className={iconClass}
  /> },
  { name: 'ViewsReceivedIcon', icon: <ViewsReceivedIcon
    className={iconClass}
  /> },
];

export const iconStoryFrames: Record<string, UiStoryFrame[]> = Object.fromEntries(
  profileStatIcons.map(({ name, icon }) => [
    name,
    [{ title: 'Default', render: () => icon }],
  ]),
);

iconStoryFrames.StatsChartIcons = [
  {
    title: 'Chart types',
    render: () => (
      <div
        className="flex items-center gap-4"
      >
        <BarChartIcon
          className={iconClass}
        />
        <LineChartIcon
          className={iconClass}
        />
        <ResetZoomIcon
          className={iconClass}
        />
      </div>
    ),
  },
];
