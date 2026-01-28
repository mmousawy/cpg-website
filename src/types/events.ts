import { Database, Tables } from '@/database.types';

// Exclude search_vector as it's only used for database FTS, not in app code
export type CPGEvent = Omit<Database['public']['Tables']['events']['Row'], 'search_vector'>;

export const eventDateFilter = ['upcoming', 'past'] as const;

export type EventDateFilterType = typeof eventDateFilter[number];

// Shared attendee type for event components
export type EventAttendee = Pick<Tables<'events_rsvps'>, 'event_id' | 'user_id'> & {
  id: string;
  email: string;
  confirmed_at: string;
  profiles: Pick<Tables<'profiles'>, 'avatar_url' | 'full_name' | 'nickname'> | null;
};
