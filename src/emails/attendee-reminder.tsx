import AddToCalendar from '@/components/events/AddToCalendar';
import { CPGEvent } from '@/types/events';

import EmailButton from './components/EmailButton';
import EmailDivider from './components/EmailDivider';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import EventDetails from './components/EventDetails';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const AttendeeReminderEmail = ({
  preview,
  fullName,
  recipientEmail,
  event,
  cancellationLink,
}: {
  preview?: boolean;
  fullName: string,
  recipientEmail?: string,
  event: CPGEvent,
  cancellationLink: string,
}) => {
  if (preview) {
    fullName = 'John Doe';
    recipientEmail = 'john.doe@example.com';

    event = {
      title: 'Contours, compositions and cropping',
      description: 'Let\'s kick off the new year with inspiration and creativity at our first meetup of 2025! Join us as Murtada hosts and delivers an engaging short talk on "Contours, Compositions, and Cropping," exploring essential techniques to refine your photography. \r\n\r\nLet\'s make 2025 the year of stunning shots and creative growth—see you there!',
      date: '2025-01-30',
      time: '13:00:00',
      location: 'The Tea Lab\r\nNieuwe Binnenweg 178 A\r\nNetherlands',
      cover_image: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/Murtada-al-Mousawy-20241214-DC4A4303.jpg',
    } as CPGEvent;

    cancellationLink = `${baseUrl}/cancel/123456`;
  }

  const previewText = `See you tomorrow! ${event?.title}`;

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        See you tomorrow!
        {' '}
        {event?.title}
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {fullName}
        ,
      </EmailText>
      <br />
      <EmailText>
        Just a friendly reminder that the event you RSVP&apos;d for is happening tomorrow! We look forward to seeing you there.
      </EmailText>

      <br />

      <EmailText>
        Need to cancel your RSVP? You can do that by clicking here:
        <br />
        <EmailButton
          href={cancellationLink}
          variant="secondary"
        >
          Cancel RSVP
        </EmailButton>
      </EmailText>

      <EmailDivider />

      <EventDetails
        event={event}
        noDescription
      />

      <AddToCalendar
        event={event}
        render="email"
      />
    </EmailLayout>
  );
};

export default AttendeeReminderEmail;
