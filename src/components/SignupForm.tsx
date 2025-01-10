import { useContext, useEffect, useState } from 'react';
import clsx from 'clsx';

import { ModalContext } from '@/app/providers/ModalProvider';
import { ExtendedEvent } from '@/components/Events';

import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import TimeSVG from 'public/icons/time.svg';
import CheckAddSVG from 'public/icons/check-add.svg';
import ErrorSVG from 'public/icons/error.svg';

type Props = {
  event?: ExtendedEvent;
}

export default function SignupForm({ event }: Props) {
  const modalContext = useContext(ModalContext);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Close the success message after the modal is closed
  useEffect(() => {
    if (!modalContext.isOpen) {
      setTimeout(() => {
        setSuccess(false);
      }, 300);
    }
  }, [modalContext.isOpen]);

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');

    // Call next api route to sign up the user
    const result = await fetch('/api/signup', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        event_id: event?.id
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    setIsSubmitting(false);

    if (result.status === 200) {
      setError(null);
      setSuccess(true);

      return;
    }

    const data = await result.json();

    if (data.message) {
      setError(data.message);
    }
  };

  if (!event) {
    return null;
  }

  return (
    <div>
      <span className='mb-2 flex gap-4 text-[15px] font-semibold leading-6'>
        <span className='flex gap-2'><CalendarSVG className="shrink-0 fill-foreground " />
          {new Date(event.date!).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'})}
        </span>
        <span className='flex gap-2'><TimeSVG className="shrink-0 fill-foreground " />{event.time?.substring(0, 5)}</span>
      </span>
      <span className='mb-6 flex items-start gap-2 whitespace-pre-wrap text-[15px] font-semibold leading-6 max-sm:hidden'>
        <LocationSVG className="shrink-0 fill-foreground " />{event.location?.replace(/\r\n/gm, ' • ')}
      </span>
      <span className='mb-6 flex items-start gap-2 whitespace-pre-wrap text-[15px] font-semibold sm:hidden'>
        <LocationSVG className="shrink-0 fill-foreground " />{event.location}
      </span>

      {!success && (
        <form
          onSubmit={submitForm}
          className={clsx([
            "flex flex-col gap-4 transition-opacity",
            isSubmitting && "pointer-events-none opacity-50"
          ])}
        >
          <div className='flex flex-col gap-2'>
            <p className='mb-4'>Awesome! You&apos;re signing up for the meetup. We just need a few details. An email will be sent to you to confirm your RSVP.</p>
            <label className='text-[15px] font-semibold' htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              className='rounded-md border-[0.0625rem] border-border-color p-2 font-[family-name:var(--font-geist-mono)]'
              type="text" name="name" placeholder="Enter your full name"
              pattern='[a-zA-Z\s]{2,}'
              required
            />
          </div>
          <div className='flex flex-col gap-2'>
            <label className='text-[15px] font-semibold' htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              className='rounded-md border-[0.0625rem] border-border-color p-2 font-[family-name:var(--font-geist-mono)]'
              type="email" name="email" placeholder="Enter your e-mail address"
              pattern='[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}'
              required
            />
          </div>

          {/* error message container */}
          { error && (
            <div className='flex gap-2 rounded-md bg-[#c5012c20] p-2 text-[15px] font-semibold leading-6 text-error-red'>
              <ErrorSVG className="shrink-0 fill-error-red" />
              <span>Error: {error}</span>
            </div>
          )}

          <button
            className={clsx([
              "font-[family-name:var(--font-geist-mono)] font-semibold text-white",
              "mt-4 flex items-center justify-center justify-self-start rounded-full border-[0.0625rem] border-primary bg-primary fill-white px-3 py-2",
              "hover:border-primary-alt hover:bg-primary-alt hover:fill-slate-950 hover:text-slate-950"
            ])}
            type="submit"
            disabled={isSubmitting}
          >
            <CheckAddSVG className="mr-2 inline-block" />
            <span className="text-nowrap">Sign up</span>
          </button>
        </form>
      )}

      {success && (
        <div className='flex gap-2 rounded-md bg-[#00a86b20] p-4 font-semibold leading-6 text-foreground'>
          <CheckAddSVG className="shrink-0 fill-foreground" />
          <span>You have signed up for this event! An email with more details is on its way to your inbox!</span>
        </div>
      )}
    </div>
  );
}
