export type MentionProfile = {
  id: string;
  nickname: string;
  full_name: string | null;
  avatar_url: string | null;
  allow_member_tags: boolean;
};
