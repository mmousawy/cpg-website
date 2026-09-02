export type StatsRange = '7d' | '30d' | '90d' | 'all';

export type StatsTimeSeriesPoint = {
  date: string;
  value: number;
};

export type StatsTimeSeries = {
  metric: string;
  points: StatsTimeSeriesPoint[];
};

export type StatsKpi = {
  label: string;
  value: number | string;
  delta?: number | null;
  format?: 'number' | 'bytes' | 'percent' | 'text';
};

export type StatsBreakdownItem = {
  label: string;
  value: number;
};

export type StatsRankedItem = {
  id: string;
  title: string;
  subtitle?: string;
  value: number;
  href?: string;
  imageUrl?: string | null;
  blurhash?: string | null;
};

export type AdminStatsOverview = {
  kpis: Record<string, number>;
  health: Record<string, number>;
  preferences: {
    themes: StatsBreakdownItem[];
    albumCardStyles: StatsBreakdownItem[];
    defaultLicenses: StatsBreakdownItem[];
    newsletterOptIn: number;
    watermarkEnabled: number;
    embedCopyrightExif: number;
    topInterests: StatsBreakdownItem[];
    emailOptOuts: StatsBreakdownItem[];
  };
  topPhotosByViews: StatsRankedItem[];
  topPhotosByLikes: StatsRankedItem[];
  storageByMember: Array<{
    id: string;
    nickname: string | null;
    full_name: string | null;
    photo_count: number;
    storage_bytes: number;
  }>;
};

export type AdminMemberStatsRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string | null;
  last_logged_in: string | null;
  suspended_at: string | null;
  deletion_scheduled_at: string | null;
  theme: string | null;
  album_card_style: string | null;
  default_license: string | null;
  watermark_enabled: boolean;
  embed_copyright_exif: boolean;
  newsletter_opt_in: boolean;
  terms_accepted_at: string | null;
  photo_count: number;
  album_count: number;
  storage_bytes: number;
  views_received: number;
  likes_received: number;
  comments_received: number;
  followers: number;
  following: number;
  rsvps_confirmed: number;
  events_attended: number;
  challenges_submitted: number;
  challenges_accepted: number;
  email_opt_out_count: number;
  interests_count: number;
};

export type MemberStatsDetail = {
  topPhotosByViews: StatsRankedItem[];
  topPhotosByLikes: StatsRankedItem[];
  largestPhotos: StatsRankedItem[];
  storageBytes: number;
  publicPhotoCount: number;
  privatePhotoCount: number;
  followers: number;
  following: number;
  sharedAlbumsJoined: number;
  sceneEventsSubmitted: number;
  sceneInterests: number;
  mimeTypes: StatsBreakdownItem[];
  licenses: StatsBreakdownItem[];
  topTags: StatsBreakdownItem[];
};
