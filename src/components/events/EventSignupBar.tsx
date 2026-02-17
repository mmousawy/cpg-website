'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import SignupForm from '@/components/auth/SignupForm';
import Button from '@/components/shared/Button';
import StickyActionBar from '@/components/shared/StickyActionBar';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import type { CPGEvent } from '@/types/events';
import { useContext, useEffect, useState } from 'react';

import CheckSVG from 'public/icons/check.svg';
import CloseSVG from 'public/icons/close.svg';
import { formatEventDate, formatEventTime } from './EventCard';

type EventSignupBarProps = {
  event: CPGEvent
}

export default function EventSignupBar({ event }: EventSignupBarProps) {
  const modalContext = useContext(ModalContext);
  const { user } = useAuth();
  const [hasRSVP, setHasRSVP] = useState(false);
  const [rsvpUuid, setRsvpUuid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useSupabase();

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
  }, [user, event, supabase]);

  const openModal = () => {
    modalContext.setTitle(`${event.title}`);
    modalContext.setContent(
      <SignupForm
        event={event}
        hasExistingRSVP={hasRSVP}
        rsvpUuid={rsvpUuid}
        onRSVPChange={setHasRSVP}
      />,
    );
    modalContext.setIsOpen(true);
  };

  // Calculate spots left
  const spotsLeft = event.max_attendees
    ? event.max_attendees - (event.rsvp_count || 0)
    : null;

  return (
    <StickyActionBar
      constrainWidth
    >
      <div
        className="flex flex-col gap-0.5"
      >
        <p
          className="text-xs sm:text-sm text-foreground font-medium"
        >
          {formatEventDate(event.date || '', { includeYear: true })}
          {' '}
          at
          {formatEventTime(event.time || '')}
        </p>

        <div
          className="flex-1"
        >
          {isLoading ? (
            <div
              className="h-5 w-24 animate-pulse rounded bg-border-color"
            />
          ) : hasRSVP ? (
            <p
              className="flex items-center text-sm font-medium text-primary"
            >
              <CheckSVG
                className="size-4 fill-current inline-block mr-1.5 align-top"
              />
              {' '}
              You&apos;re going!
            </p>
          ) : spotsLeft !== null && spotsLeft > 0 ? (
            <p
              className="text-sm text-foreground/70"
            >
              {spotsLeft}
              {' '}
              {spotsLeft === 1 ? 'spot' : 'spots'}
              {' '}
              left
            </p>
          ) : spotsLeft === 0 ? (
            <p
              className="text-sm text-foreground/70"
            >
              Event is full
            </p>
          ) : (
            <p
              className="text-sm text-foreground/70"
            >
              Reserve your spot
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={openModal}
        disabled={isLoading || (spotsLeft === 0 && !hasRSVP)}
        icon={hasRSVP ? <CloseSVG
          className="size-4 -ml-0.5 fill-current"
        /> : <CheckSVG
          className="size-4 -ml-0.5 fill-current"
        />}
        variant={hasRSVP ? 'secondary' : 'primary'}
        size="md"
        className="rounded-full"
      >
        {isLoading ? '...' : hasRSVP ? 'Cancel RSVP' : 'Join event'}

      </Button>
    </StickyActionBar>
  );
}
