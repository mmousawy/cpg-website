'use client';

import clsx from 'clsx';
import { useContext, useEffect, useState } from 'react';

import SignupForm from '../auth/SignupForm';
import Button from '../shared/Button';

import { ModalContext } from '@/app/providers/ModalProvider';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import { CPGEvent } from '@/types/events';

import CheckSVG from 'public/icons/check.svg';

type Props = {
  className?: string;
  event?: CPGEvent;
}

export default function EventRsvpStatus({ className, event }: Props) {
  const modalContext = useContext(ModalContext);
  const { user } = useAuth();
  const supabase = useSupabase();
  const [hasRSVP, setHasRSVP] = useState(false);
  const [rsvpUuid, setRsvpUuid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if event is in the past
  const isPastEvent = (() => {
    if (!event?.date) return false;
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return eventDate < now;
  })();

  useEffect(() => {
    const checkRSVP = async () => {
      if (!user || !event) {
        setIsLoading(false);
        return;
      }
      const { data } = await supabase
        .from('events_rsvps')
        .select('id, uuid')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .is('canceled_at', null)
        .not('confirmed_at', 'is', null)
        .single();

      setHasRSVP(!!data);
      setRsvpUuid(data?.uuid || null);
      setIsLoading(false);
    };

    checkRSVP();
  }, [user, event]);

  const openModal = () => {
    modalContext.setTitle(`${event?.title}`);
    modalContext.setContent(<SignupForm event={event} hasExistingRSVP={hasRSVP} rsvpUuid={rsvpUuid} onRSVPChange={setHasRSVP} />);
    modalContext.setIsOpen(true);
  };

  // Show "Event passed" for past events if user didn't RSVP
  if (isPastEvent && !hasRSVP) {
    return (
      <span className={clsx('inline-flex self-start font-[family-name:var(--font-geist-mono)] items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1.5 text-sm font-medium text-foreground/60 whitespace-nowrap', className)}>
        Event passed
      </span>
    );
  }

  if (isLoading) {
    return (
      <div className={clsx('h-8 w-20 animate-pulse rounded-full bg-border-color', className)} />
    );
  }

  if (hasRSVP) {
    return (
      <span className={clsx('inline-flex font-[family-name:var(--font-geist-mono)] items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary whitespace-nowrap', className)}>
        <CheckSVG className="size-4 fill-current" />
        {isPastEvent ? 'You went!' : "You're going!"}
      </span>
    );
  }

  return (
    <Button
      size="sm"
      onClick={openModal}
      className={clsx('rounded-full inline-flex', className)}
      variant="primary"
    >
      Join event
    </Button>
  );
}
