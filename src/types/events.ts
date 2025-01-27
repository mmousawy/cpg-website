import { Database } from '@/database.types';

export type CPGEvent = Database['public']['Tables']['events']['Row'];

export const eventDateFilter = ["upcoming", "past"] as const;

export type EventDateFilterType = typeof eventDateFilter[number];
