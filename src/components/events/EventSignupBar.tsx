'use client';

import { useContext, useEffect, useState } from 'react';
import { ModalContext } from '@/app/providers/ModalProvider';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/utils/supabase/client';
import StickyActionBar from '@/components/shared/StickyActionBar';
import Button from '@/components/shared/Button';
import SignupForm from '@/components/auth/SignupForm';
import type { CPGEvent } from '@/types/events';

import CheckSVG from 'public/icons/check.svg';
import CloseSVG from 'public/icons/close.svg';

type EventSignupBarProps = {
  event: CPGEvent
}

export default function EventSignupBar({ event }: EventSignupBarProps) {
  const modalContext = useContext(ModalContext);
  const { user } = useAuth();
  const [hasRSVP, setHasRSVP] = useState(false);
  const [rsvpUuid, setRsvpUuid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkRSVP = async () => {
      if (!user || !event) {
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
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
    <StickyActionBar>
      <div className="flex-1">
        {isLoading ? (
          <div className="h-5 w-24 animate-pulse rounded bg-border-color" />
        ) : hasRSVP ? (
          <p className="text-sm font-medium text-primary">
            ✓ You&apos;re going!
          </p>
        ) : spotsLeft !== null && spotsLeft > 0 ? (
          <p className="text-sm text-foreground/70">
            {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
          </p>
        ) : spotsLeft === 0 ? (
          <p className="text-sm text-foreground/70">
            Event is full
          </p>
        ) : (
          <p className="text-sm text-foreground/70">
            Reserve your spot
          </p>
        )}
      </div>

      <Button
        onClick={openModal}
        disabled={isLoading || (spotsLeft === 0 && !hasRSVP)}
        icon={hasRSVP ? <CloseSVG /> : <CheckSVG />}
        variant={hasRSVP ? 'secondary' : 'primary'}
        size="md"
        className="rounded-full"
      >
        {isLoading ? '...' : hasRSVP ? 'Cancel RSVP' : 'Join this event'}
      </Button>
    </StickyActionBar>
  );
}



