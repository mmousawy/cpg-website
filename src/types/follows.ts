export type FollowListType = 'followers' | 'following';

export type FollowListMember = {
  id: string;
  nickname: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type FollowListResponse = {
  members: FollowListMember[];
  totalCount: number;
  hasMore: boolean;
};
