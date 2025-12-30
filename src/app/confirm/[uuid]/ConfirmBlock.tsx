'use client';

import { useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import Link from 'next/link';

import AddToCalendar from '@/components/AddToCalendar';

import { Database } from '@/database.types';
import { CPGEvent } from '@/types/events';

import CheckSVG from 'public/icons/check.svg';
import CloseSVG from 'public/icons/close.svg';
import CheckAddSVG from 'public/icons/check-add.svg';
import CalendarSVG from 'public/icons/calendar2.svg';
import LocationSVG from 'public/icons/location.svg';
import CancelSVG from 'public/icons/cancel.svg';
import TimeSVG from 'public/icons/time.svg';

type Props = {
  event: CPGEvent;
  rsvp: Database['public']['Tables']['events_rsvps']['Row'];
}

export default function ConfirmBlock({ event, rsvp }: Props) {
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const confirmSignup = async () => {
    const result = await fetch('/api/confirm', {
      method: 'POST',
      body: JSON.stringify({
        uuid: rsvp.uuid,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (result.status === 200) {
      setSignupSuccess(true);
    }
  };

  const cancelSignup = async () => {
    const result = await fetch('/api/cancel', {
      method: 'POST',
      body: JSON.stringify({
        uuid: rsvp.uuid,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (result.status === 200) {
      setCancelSuccess(true);
    }
  };

  return (
    <div className="flex gap-6 max-sm:flex-col-reverse max-sm:gap-4">
      <div className='grow'>
        <div className='mb-6 flex justify-between'>
          <h3 className="text-2xl font-bold">{event.title}</h3>
        </div>
        <div className='flex flex-col'>
          <div>
            <span className='mb-2 flex gap-4 text-[15px] font-semibold leading-6 max-sm:mb-2'>
              <span className='flex gap-2'><CalendarSVG className="shrink-0 fill-foreground" />
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
          </div>

          {(!signupSuccess && !cancelSuccess) && (
            <>
              {(!rsvp.confirmed_at && !rsvp.canceled_at) && (
                <>
                  <p className='mb-6'>Hi {rsvp.name}!<br /><br />You are confirming your sign up for the above mentioned meeting. You can always change your RSVP later.</p>
                  <div className="flex items-center gap-4 max-sm:justify-between">
                    <Button
                      size="sm"
                      icon={<CheckSVG />}
                      onClick={confirmSignup}
                      className="rounded-full"
                    >
                      Confirm RSVP
                    </Button>

                    <Button
                      size="sm"
                      variant="danger"
                      icon={<CloseSVG />}
                      onClick={cancelSignup}
                      className="rounded-full"
                    >
                      Cancel RSVP
                    </Button>
                  </div>
                </>
              )}

              {(rsvp.confirmed_at && !rsvp.canceled_at) && (
                <div className='flex gap-2 rounded-md bg-[#00a86b20] p-4 font-semibold leading-6 text-foreground'>
                  <CheckAddSVG className="shrink-0 fill-foreground" />
                  <span>
                    You&apos;ve already confirmed your RSVP. <br />If you&apos;d like to change your response, you can{' '}<br />
                    <Link href={`/cancel/${rsvp.uuid}`} className='underline'>cancel your sign up</Link>
                    .
                  </span>
                </div>
              )}

              {rsvp.canceled_at && (
                <div className='flex gap-2 rounded-md bg-[#c4c4c420] p-4 font-semibold leading-6 text-foreground'>
                  <CancelSVG className="shrink-0 fill-foreground" />
                  <span>
                    You&apos;ve already canceled your RSVP. <br />If you&apos;ve changed your mind, you can always sign up again!
                  </span>
                </div>
              )}
            </>
          )}

          {signupSuccess && (
            <>
              <div className='mb-6 flex flex-col gap-4 rounded-md bg-[#00a86b20] p-4 font-semibold leading-6 text-foreground'>
                <div className='flex gap-2'>
                  <CheckAddSVG className="shrink-0 fill-foreground" />
                  <span>Thank you for confirming your RSVP.<br />We look forward to seeing you at the meetup!</span>
                </div>
              </div>

              <AddToCalendar event={event} />
            </>
          )}

          {cancelSuccess && (
            <div className='flex gap-2 rounded-md bg-[#c4c4c420] p-4 font-semibold leading-6 text-foreground'>
              <CancelSVG className="shrink-0 fill-foreground" />
              <span>You&apos;ve successfully canceled your RSVP.<br />If you change your mind, you can always sign up again!</span>
            </div>
          )}

        </div>
      </div>
      <Image
        width={640}
        height={640}
        alt='Event cover image'
        className='size-44 rounded-md object-cover max-sm:h-28 max-sm:w-full'
        src={event.cover_image!}
      />
    </div>
  );
}
