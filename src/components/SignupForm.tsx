'use client'

import { useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';

import { ModalContext } from '@/app/providers/ModalProvider';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/config/routes';
import { CPGEvent } from '@/types/events';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import TimeSVG from 'public/icons/time.svg';
import CheckAddSVG from 'public/icons/check-add.svg';
import ErrorSVG from 'public/icons/error.svg';
import CloseSVG from 'public/icons/close.svg';

type Props = {
  event?: CPGEvent;
  hasExistingRSVP?: boolean;
  rsvpUuid?: string | null;
  onRSVPChange?: (hasRSVP: boolean) => void;
}

export default function SignupForm({ event, hasExistingRSVP = false, rsvpUuid, onRSVPChange }: Props) {
  const modalContext = useContext(ModalContext);
  const { user, isLoading: authLoading } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  // Close the success message after the modal is closed
  useEffect(() => {
    if (!modalContext.isOpen) {
      setTimeout(() => {
        setSuccess(false);
      }, 300);
    }
  }, [modalContext.isOpen]);

  const handleCancel = useCallback(async () => {
    if (!user || !event || !rsvpUuid) return;

    setError(null);
    setIsCanceling(true);

    try {
      const result = await fetch('/api/cancel', {
        method: 'POST',
        body: JSON.stringify({
          uuid: rsvpUuid,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setIsCanceling(false);

      if (result.status === 200) {
        onRSVPChange?.(false);
        setSuccess(true);
        return;
      }

      const data = await result.json();
      setError(data.message || 'Failed to cancel RSVP');
    } catch (err) {
      setIsCanceling(false);
      setError('An error occurred while canceling your RSVP');
    }
  }, [event, user, rsvpUuid, onRSVPChange, modalContext]);

  const submitForm = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to sign up for events');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    // Call next api route to sign up the user
    const result = await fetch('/api/signup', {
      method: 'POST',
      body: JSON.stringify({
        event_id: event?.id,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    setIsSubmitting(false);

    if (result.status === 200) {
      setError(null);
      setSuccess(true);
      onRSVPChange?.(true);
      return;
    }

    const data = await result.json();

    if (data.message) {
      setError(data.message);
    }
  }, [event, user]);

  if (!event) {
    return null;
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <LoadingSpinner centered />
    );
  }

  return (
    <div>
      <span className='mb-2 flex gap-4 text-[15px] font-semibold leading-6'>
        <span className='flex gap-2'><CalendarSVG className="shrink-0 fill-foreground " />
          {new Date(event.date!).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span className='flex gap-2'><TimeSVG className="shrink-0 fill-foreground " />{event.time?.substring(0, 5)}</span>
      </span>
      <span className='mb-6 flex items-start gap-2 whitespace-pre-wrap text-[15px] font-semibold leading-6 max-sm:hidden'>
        <LocationSVG className="shrink-0 fill-foreground " />{event.location?.replace(/\r\n/gm, ' • ')}
      </span>
      <span className='mb-6 flex items-start gap-2 whitespace-pre-wrap text-[15px] font-semibold sm:hidden'>
        <LocationSVG className="shrink-0 fill-foreground " />{event.location}
      </span>

      {/* Not logged in - show login prompt */}
      {!user && !success && (
        <div className="rounded-xl border border-border-color bg-background p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold">Log in to RSVP</h3>
          <p className="mb-4 text-sm text-foreground/70">
            You need an account to sign up for events.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`${routes.login.url}?redirectTo=/`}
              onClick={() => modalContext.setIsOpen(false)}
              className="rounded-full border border-border-color bg-background px-6 py-2 text-sm font-semibold transition-colors hover:border-primary hover:bg-primary/5"
            >
              {routes.login.label}
            </Link>
            <Link
              href={routes.signup.url}
              onClick={() => modalContext.setIsOpen(false)}
              className="rounded-full border border-primary bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:border-primary-alt hover:bg-primary-alt hover:text-slate-950"
            >
              {routes.signup.label}
            </Link>
          </div>
        </div>
      )}

      {/* Logged in - show RSVP form */}
      {user && !success && !hasExistingRSVP && (
        <form
          onSubmit={submitForm}
          className={clsx([
            "flex flex-col gap-4 transition-opacity",
            isSubmitting && "pointer-events-none opacity-50"
          ])}
        >
          <div className='flex gap-2 rounded-md bg-foreground/5 p-4 font-semibold leading-6 text-foreground'>
            <svg className="shrink-0 h-6 w-6 fill-foreground" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <div>
              <p>Signing up as</p>
              <p className="mt-1 text-sm font-normal text-foreground/70">
                {user.user_metadata?.full_name || user.email} ({user.email})
              </p>
            </div>
          </div>

          <p className="text-sm text-foreground/70">
            Click the button below to confirm your spot. You&apos;ll receive a confirmation email with all the event details.
          </p>

          {/* error message container */}
          {error && (
            <div className='flex gap-2 rounded-md bg-[#c5012c20] p-2 text-[15px] font-semibold leading-6 text-error-red'>
              <ErrorSVG className="shrink-0 fill-error-red" />
              <span>Error: {error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            icon={<CheckAddSVG />}
            className="mt-2 rounded-full"
          >
            {isSubmitting ? 'Signing up...' : 'Confirm RSVP'}
          </Button>
        </form>
      )}

      {/* User has existing RSVP - show cancel option */}
      {user && !success && hasExistingRSVP && (
        <div className="flex flex-col gap-4">
          <div className='flex gap-2 rounded-md bg-[#00a86b20] p-4 font-semibold leading-6 text-foreground'>
            <CheckAddSVG className="shrink-0 fill-foreground" />
            <div>
              <p>You&apos;re signed up for this event!</p>
              <p className="mt-1 text-sm font-normal text-foreground/70">
                A confirmation email was sent to {user.email}
              </p>
            </div>
          </div>

          <p className="text-sm text-foreground/70">
            Need to cancel? Click the button below to remove your RSVP.
          </p>

          {/* error message container */}
          {error && (
            <div className='flex gap-2 rounded-md bg-[#c5012c20] p-2 text-[15px] font-semibold leading-6 text-error-red'>
              <ErrorSVG className="shrink-0 fill-error-red" />
              <span>Error: {error}</span>
            </div>
          )}

          <Button
            onClick={handleCancel}
            disabled={isCanceling}
            variant="danger"
            icon={<CloseSVG />}
            className="rounded-full"
          >
            {isCanceling ? 'Canceling...' : 'Cancel RSVP'}
          </Button>
        </div>
      )}

      {success && hasExistingRSVP && (
        <div className='flex gap-2 rounded-md bg-orange-500/20 p-4 font-semibold leading-6 text-foreground'>
          <CloseSVG className="shrink-0 fill-foreground" />
          <span>Your RSVP has been cancelled. You can sign up again anytime.</span>
        </div>
      )}

      {success && !hasExistingRSVP && (
        <div className='flex gap-2 rounded-md bg-[#00a86b20] p-4 font-semibold leading-6 text-foreground'>
          <CheckAddSVG className="shrink-0 fill-foreground" />
          <span>You&apos;re all set! A confirmation email with event details is on its way to your inbox.</span>
        </div>
      )}
    </div>
  );
}
