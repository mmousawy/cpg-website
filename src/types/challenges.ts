import type { Tables } from '@/database.types';

// Base types from database
export type Challenge = Tables<'challenges'>;
export type ChallengeSubmission = Tables<'challenge_submissions'>;
export type ChallengeAnnouncement = Tables<'challenge_announcements'>;

// Status type for submissions
export type ChallengeStatus = 'pending' | 'accepted' | 'rejected';

// Challenge photo from view (accepted submissions with photo data)
export type ChallengePhoto = {
  challenge_id: string;
  photo_id: string;
  user_id: string;
  submitted_at: string;
  reviewed_at: string | null;
  url: string;
  width: number | null;
  height: number | null;
  title: string | null;
  blurhash: string | null;
  short_id: string | null;
  profile_nickname: string | null;
  profile_full_name: string | null;
  profile_avatar_url: string | null;
};

// Extended challenge with counts and creator info
export type ChallengeWithStats = Challenge & {
  submission_count?: number;
  accepted_count?: number;
  pending_count?: number;
  rejected_count?: number;
  creator?: {
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  contributors?: Array<{
    id: string;
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }>;
};

// Challenge with its accepted photos for gallery display
export type ChallengeWithPhotos = Challenge & {
  photos: ChallengePhoto[];
  contributors?: Array<{
    user_id: string;
    nickname: string | null;
    avatar_url: string | null;
  }>;
};

// Submission with photo and challenge info
export type SubmissionWithDetails = ChallengeSubmission & {
  photo: {
    id: string;
    short_id: string;
    url: string;
    width: number | null;
    height: number | null;
    title: string | null;
    blurhash: string | null;
  };
  challenge?: {
    id: string;
    slug: string;
    title: string;
    cover_image_url: string | null;
    image_blurhash: string | null;
    ends_at: string | null;
    is_active: boolean;
  };
  user?: {
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
};

// For admin review queue
export type SubmissionForReview = ChallengeSubmission & {
  photo: {
    id: string;
    short_id: string;
    url: string;
    width: number | null;
    height: number | null;
    title: string | null;
    blurhash: string | null;
  };
  user: {
    id: string;
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
};

// Form data for creating/editing challenges
export type ChallengeFormData = {
  title: string;
  slug: string;
  prompt: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};
