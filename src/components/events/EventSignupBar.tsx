'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import SignupForm from '@/components/auth/SignupForm';
import Button from '@/components/shared/Button';
import StickyActionBar from '@/components/shared/StickyActionBar';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useSession } from '@/hooks/useSession';
import { useSupabase } from '@/hooks/useSupabase';
import { formatEventDate, formatEventTime } from '@/lib/events/format';
import type { CPGEvent } from '@/types/events';
import { isProfileComplete } from '@/utils/profileCompletion';
import { usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';

import CheckSVG from 'public/icons/check.svg';
import CloseSVG from 'public/icons/close.svg';

type EventSignupBarProps = {
  event: CPGEvent
  confirmedAttendeeCount: number
}

function getSpotsLeft(event: CPGEvent, confirmedAttendeeCount: number) {
  return event.max_attendees
    ? event.max_attendees - confirmedAttendeeCount
    : null;
}

function EventSignupBarGuest({ event, confirmedAttendeeCount }: EventSignupBarProps) {
  const showAuthPrompt = useAuthPrompt();
  const spotsLeft = getSpotsLeft(event, confirmedAttendeeCount);

  const openAuthPrompt = () => {
    showAuthPrompt({
      feature: 'RSVP for events',
      title: 'Join this event',
      description: 'Sign in or create a free account to reserve your spot.',
    });
  };

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
          {' '}
          {formatEventTime(event.time || '')}
        </p>

        <div
          className="flex-1"
        >
          {spotsLeft !== null && spotsLeft > 0 ? (
            <p
              className="text-sm text-foreground/80"
            >
              {spotsLeft}
              {' '}
              {spotsLeft === 1 ? 'spot' : 'spots'}
              {' '}
              left
            </p>
          ) : spotsLeft === 0 ? (
            <p
              className="text-sm text-foreground/80"
            >
              Event is full
            </p>
          ) : (
            <p
              className="text-sm text-foreground/80"
            >
              Reserve your spot
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={openAuthPrompt}
        disabled={spotsLeft === 0}
        icon={(
          <CheckSVG
            className="size-4 -ml-0.5 fill-current"
          />
        )}
        variant="primary"
        size="md"
        className="rounded-full"
      >
        Join event
      </Button>
    </StickyActionBar>
  );
}

function EventSignupBarAuthenticated({ event, confirmedAttendeeCount }: EventSignupBarProps) {
  const modalContext = useContext(ModalContext);
  const { user, profile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasRSVP, setHasRSVP] = useState(false);
  const [rsvpUuid, setRsvpUuid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useSupabase();
  const spotsLeft = getSpotsLeft(event, confirmedAttendeeCount);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!profile) return;

    if (!isProfileComplete(profile, { fallbackEmail: user.email ?? null })) {
      router.push(`/onboarding?redirectTo=${encodeURIComponent(pathname)}`);
    }
  }, [authLoading, user, profile, pathname, router]);

  useEffect(() => {
    const checkRSVP = async () => {
      if (!user || !event || authLoading || !isProfileComplete(profile, { fallbackEmail: user.email ?? null })) {
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
  }, [user, profile, event, supabase, authLoading]);

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
    modalContext.setFooter(null);
    modalContext.setIsOpen(true);
  };

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
          {' '}
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
              className="text-sm text-foreground/80"
            >
              {spotsLeft}
              {' '}
              {spotsLeft === 1 ? 'spot' : 'spots'}
              {' '}
              left
            </p>
          ) : spotsLeft === 0 ? (
            <p
              className="text-sm text-foreground/80"
            >
              Event is full
            </p>
          ) : (
            <p
              className="text-sm text-foreground/80"
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

export default function EventSignupBar(props: EventSignupBarProps) {
  const { isLoggedIn } = useSession();

  if (!isLoggedIn) {
    return (
      <EventSignupBarGuest
        {...props}
      />
    );
  }

  return (
    <EventSignupBarAuthenticated
      {...props}
    />
  );
}
