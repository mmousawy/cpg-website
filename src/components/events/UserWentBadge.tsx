'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';
import { useSupabase } from '@/hooks/useSupabase';

import CheckSVG from 'public/icons/check.svg';

type UserWentBadgeProps = {
  eventId: number;
  /** Use for hero overlay (backdrop-blur, light text); default is standard badge */
  variant?: 'overlay' | 'default';
  className?: string;
};

function UserWentBadgeAuthenticated({
  eventId,
  variant = 'default',
  className = '',
}: UserWentBadgeProps) {
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
          ? `inline-flex items-center gap-1.5 rounded-full bg-primary/80 dark:bg-primary/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm ${className}`
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

export default function UserWentBadge(props: UserWentBadgeProps) {
  const { isLoggedIn } = useSession();

  if (!isLoggedIn) {
    return null;
  }

  return (
    <UserWentBadgeAuthenticated
      {...props}
    />
  );
}
