'use client';

import clsx from 'clsx';
import { useContext, useEffect, useState } from 'react';

import SignupForm from '../auth/SignupForm';
import Button from '../shared/Button';

import { ModalContext } from '@/app/providers/ModalProvider';
import { CPGEvent } from '@/types/events';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/utils/supabase/client';

import CheckSVG from 'public/icons/check.svg';
import CloseSVG from 'public/icons/close.svg';

type Props = {
  className?: string;
  event?: CPGEvent;
}

export default function SignupButton({ className, event }: Props) {
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
    modalContext.setTitle(`${event?.title}`);
    modalContext.setContent(<SignupForm event={event} hasExistingRSVP={hasRSVP} rsvpUuid={rsvpUuid} onRSVPChange={setHasRSVP} />);
    modalContext.setIsOpen(true);
  };

  if (isLoading) {
    return (
      <div className={className}>
        <Button
          size="sm"
          disabled
          className="rounded-full"
        >
          ...
        </Button>
      </div>
    );
  }

  return (
    <div
      className={className}
    >
      <Button
        size="sm"
        icon={hasRSVP ? <CloseSVG /> : <CheckSVG />}
        onClick={openModal}
        className="rounded-full"
        variant={hasRSVP ? 'secondary' : 'primary'}
      >
        {hasRSVP ? 'Cancel RSVP' : 'Join'}
      </Button>
    </div>
  );
}
