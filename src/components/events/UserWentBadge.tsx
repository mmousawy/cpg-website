'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';

import CheckSVG from 'public/icons/check.svg';

type UserWentBadgeProps = {
  eventId: number;
  /** Use for hero overlay (backdrop-blur, light text); default is standard badge */
  variant?: 'overlay' | 'default';
  className?: string;
};

/**
 * Shows "You went!" when the current user has attended this past event (events_rsvps.attended_at set).
 * Renders nothing if the user did not attend or is not logged in.
 */
export default function UserWentBadge({ eventId, variant = 'default', className = '' }: UserWentBadgeProps) {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [attended, setAttended] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAttended = async () => {
      if (!user) {
        setAttended(false);
        return;
      }
      const { data } = await supabase
        .from('events_rsvps')
        .select('attended_at')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .not('attended_at', 'is', null)
        .maybeSingle();

      setAttended(!!data?.attended_at);
    };

    checkAttended();
  }, [user, eventId, supabase]);

  if (attended !== true) return null;

  const isOverlay = variant === 'overlay';

  return (
    <span
      className={
        isOverlay
          ? `inline-flex items-center gap-1.5 rounded-full bg-primary/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm ${className}`
          : `inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white whitespace-nowrap ${className}`
      }
    >
      <CheckSVG
        className="size-3 fill-white"
      />
      You went!
    </span>
  );
}
