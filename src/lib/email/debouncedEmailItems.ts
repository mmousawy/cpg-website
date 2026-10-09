import type { MemberNotificationKind } from '@/emails/member-notification';

export type QueuedSubmissionNotificationItem = {
  submitterName: string;
  submitterNickname: string | null;
  submitterAvatarUrl: string | null;
  submitterProfileLink: string | null;
  photoCount: number;
  photoUrls: string[];
  challengeTitle: string;
  challengeThumbnail: string | null;
  challengeLink: string;
  reviewLink: string;
};

export type QueuedMemberNotificationItem = {
  kind: MemberNotificationKind;
  memberName: string;
  memberNickname: string | null;
  memberEmail: string | null;
  profileLink: string | null;
  membersLink: string;
  deletionDate?: string;
  initiatedByAdmin?: boolean;
  initiatedByName?: string | null;
};

export type QueuedReportNotificationItem = {
  reporterName: string;
  reporterNickname: string | null;
  reporterEmail: string | null;
  reporterAvatarUrl: string | null;
  reporterProfileLink: string | null;
  entityType: 'photo' | 'album' | 'profile' | 'comment';
  entityTitle: string;
  entityThumbnail: string | null;
  entityLink: string | null;
  reason: string;
  details: string | null;
  reviewLink: string;
  isAnonymous: boolean;
};

export type QueuedFeedbackNotificationItem = {
  submitterName: string;
  submitterEmail: string | null;
  subject: string;
  subjectLabel: string;
  message: string;
  screenshots: string[] | null;
  reviewLink: string;
};

export type QueuedSubmissionResultItem = {
  status: 'accepted' | 'rejected';
  photos: Array<{ url: string; title: string | null }>;
  challengeTitle: string;
  challengeLink: string;
  rejectionReason?: string | null;
};

export type QueuedReportResolvedItem = {
  entityType: 'photo' | 'album' | 'profile' | 'comment';
  entityTitle: string;
  entityThumbnail: string | null;
  entityLink: string | null;
  entityOwnerNickname?: string | null;
  entityShortId?: string | null;
  entityCreatedAt?: string | null;
  entityPhotoCount?: number | null;
  reason: string;
  resolutionType: string;
  message?: string | null;
  isAnonymous: boolean;
};
