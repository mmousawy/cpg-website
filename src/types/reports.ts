import type { Tables } from '@/database.types';

// Base type from database
export type Report = Tables<'reports'>;

// Entity types that can be reported
export type ReportEntityType = 'photo' | 'album' | 'profile' | 'comment';

// Report status
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

// For admin review queue - includes reporter info and entity details
export type ReportForReview = Report & {
  // For authenticated reporters
  reporter: {
    id: string;
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  // For the admin who reviewed/resolved the report
  reviewer: {
    id: string;
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  // For profile reports - the reported profile
  reported_profile?: {
    id: string;
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  // Entity details populated based on entity_type
  // Will be populated in data layer based on entity_type
};

// Form data for submitting a report
export type ReportFormData = {
  entityType: ReportEntityType;
  entityId: string;
  reason: string;
  details?: string;
  // For anonymous reports
  reporterName?: string;
  reporterEmail?: string;
};
