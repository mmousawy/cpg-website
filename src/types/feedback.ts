import type { Tables } from '@/database.types';

// Base type from database
export type Feedback = Tables<'feedback'>;

// Feedback status
export type FeedbackStatus = 'new' | 'read' | 'archived';

// Predefined feedback subjects
export const FEEDBACK_SUBJECTS = [
  { value: 'general', label: 'General feedback' },
  { value: 'bug', label: 'Bug report' },
  { value: 'feature', label: 'Feature request' },
  { value: 'events', label: 'Events' },
  { value: 'challenges', label: 'Photo challenges' },
  { value: 'gallery', label: 'Gallery & photos' },
  { value: 'account', label: 'Account & profile' },
  { value: 'other', label: 'Other' },
] as const;

export type FeedbackSubject = (typeof FEEDBACK_SUBJECTS)[number]['value'];

// For admin review queue - includes submitter profile for authenticated users
export type FeedbackForReview = Feedback & {
  submitter: {
    id: string;
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};
