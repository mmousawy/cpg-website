import type { Tables } from '@/database.types';

export type AdminMemberStatusFilter = 'all' | 'active' | 'suspended' | 'under_review';

/** Profiles fields returned by GET /api/admin/members */
export type AdminMemberProfile = Pick<
  Tables<'profiles'>,
  | 'id'
  | 'email'
  | 'full_name'
  | 'nickname'
  | 'avatar_url'
  | 'is_admin'
  | 'created_at'
  | 'last_logged_in'
  | 'suspended_at'
  | 'suspended_reason'
  | 'deletion_scheduled_at'
  | 'deletion_source'
  | 'under_review_at'
  | 'website'
  | 'bio'
  | 'social_links'
  | 'link_publish_state'
  | 'newsletter_opt_in'
  | 'terms_accepted_at'
>;

export type AdminMemberSignupSignal = Pick<
  Tables<'signup_signals'>,
  'ip_address' | 'user_agent' | 'accept_language' | 'source'
> | null;

export type AdminMemberActivity = {
  photo_count: number;
  album_count: number;
  storage_bytes: number;
  views_received: number;
  likes_received: number;
  followers: number;
  following: number;
};

export type AdminMember = AdminMemberProfile & {
  signup_signal: AdminMemberSignupSignal;
  activity: AdminMemberActivity;
};
