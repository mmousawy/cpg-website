import type { Interest } from '@/types/interests';
import type { Tag as TagType } from '@/types/photos';

export const fixtureMember = {
  id: '00000000-0000-4000-8000-000000000001',
  full_name: 'Alex Morgan',
  nickname: 'alexmorgan',
  avatar_url: null as string | null,
};

export const fixtureMembers = [
  fixtureMember,
  {
    id: '00000000-0000-4000-8000-000000000002',
    full_name: 'Jamie Lee',
    nickname: 'jamielee',
    avatar_url: null as string | null,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    full_name: null,
    nickname: 'filmnora',
    avatar_url: null as string | null,
  },
];

export const fixtureProfileStats = {
  photos: 128,
  albums: 12,
  eventsAttended: 8,
  commentsMade: 45,
  commentsReceived: 62,
  likesReceived: 240,
  likesGiven: 180,
  viewsReceived: 3200,
  memberSince: '2022-03-15',
  challengesParticipated: 5,
  challengePhotosAccepted: 3,
};

export const fixtureInterests: Interest[] = [
  { id: '1', name: 'Street', count: 24, created_at: null },
  { id: '2', name: 'Portrait', count: 18, created_at: null },
  { id: '3', name: 'Film', count: 9, created_at: null },
];

export const fixtureTags: TagType[] = [
  { id: '1', name: 'amsterdam', count: 42, created_at: null },
  { id: '2', name: 'night', count: 28, created_at: null },
  { id: '3', name: 'bw', count: 15, created_at: null },
];
