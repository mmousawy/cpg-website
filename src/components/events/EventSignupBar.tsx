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
import { useCallback, useContext, useEffect, useState } from 'react';

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
    <>
      <div
        className="flex min-w-0 flex-col gap-0.5 max-sm:gap-0"
      >
        <p
          className="text-xs sm:text-sm text-foreground font-medium max-sm:truncate"
        >
          {formatEventDate(event.date || '', { includeYear: true })}
          {' '}
          at
          {' '}
          {formatEventTime(event.time || '')}
        </p>

        <div
          className="flex-1 min-w-0"
        >
          {spotsLeft !== null && spotsLeft > 0 ? (
            <p
              className="text-sm text-foreground/80 max-sm:text-xs max-sm:truncate"
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
        className="shrink-0 rounded-full max-sm:px-3 max-sm:text-sm"
      >
        Join event
      </Button>
    </>
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

  const loadRSVPStatus = useCallback(async () => {
    if (!user || !event) {
      return { hasRSVP: false, rsvpUuid: null };
    }

    const { data } = await supabase
      .from('events_rsvps')
      .select('id, uuid')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .is('canceled_at', null)
      .not('confirmed_at', 'is', null)
      .maybeSingle();

    return { hasRSVP: !!data, rsvpUuid: data?.uuid ?? null };
  }, [user, event, supabase]);

  useEffect(() => {
    const checkRSVP = async () => {
      if (authLoading) return;
      if (!user || !event) {
        setIsLoading(false);
        return;
      }

      const status = await loadRSVPStatus();
      setHasRSVP(status.hasRSVP);
      setRsvpUuid(status.rsvpUuid);
      setIsLoading(false);
    };

    checkRSVP();
  }, [authLoading, user, event, loadRSVPStatus]);

  const handleRSVPChange = useCallback(async (nextHasRSVP: boolean) => {
    if (nextHasRSVP) {
      const status = await loadRSVPStatus();
      setHasRSVP(status.hasRSVP);
      setRsvpUuid(status.rsvpUuid);
    } else {
      setHasRSVP(false);
      setRsvpUuid(null);
    }
  }, [loadRSVPStatus]);

  const openModal = () => {
    modalContext.setTitle(`${event.title}`);
    modalContext.setContent(
      <SignupForm
        event={event}
        hasExistingRSVP={hasRSVP}
        rsvpUuid={rsvpUuid}
        onRSVPChange={handleRSVPChange}
      />,
    );
    modalContext.setFooter(null);
    modalContext.setIsOpen(true);
  };

  return (
    <>
      <div
        className="flex min-w-0 flex-col gap-0.5 max-sm:gap-0"
      >
        <p
          className="text-xs sm:text-sm text-foreground font-medium max-sm:truncate"
        >
          {formatEventDate(event.date || '', { includeYear: true })}
          {' '}
          at
          {' '}
          {formatEventTime(event.time || '')}
        </p>

        <div
          className="min-w-0 flex-1 mt-1"
        >
          {isLoading ? (
            <div
              className="h-5 w-24 animate-pulse rounded bg-border-color"
            />
          ) : hasRSVP ? (
            <p
              className="flex items-center text-sm font-medium text-primary max-sm:text-xs"
            >
              <CheckSVG
                className="size-4 fill-current inline-block mr-1.5 align-top max-sm:mr-1 max-sm:size-3.5"
              />
              You&apos;re going!
            </p>
          ) : spotsLeft !== null && spotsLeft > 0 ? (
            <p
              className="text-sm text-foreground/80 max-sm:text-xs max-sm:truncate"
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
        className="shrink-0 rounded-full max-sm:px-3 max-sm:text-sm"
      >
        {isLoading ? '...' : hasRSVP ? 'Cancel RSVP' : 'Join event'}

      </Button>
    </>
  );
}

export default function EventSignupBar(props: EventSignupBarProps) {
  const { isLoggedIn } = useSession();

  return (
    <StickyActionBar constrainWidth>
      {isLoggedIn ? (
        <EventSignupBarAuthenticated {...props} />
      ) : (
        <EventSignupBarGuest {...props} />
      )}
    </StickyActionBar>
  );
}
