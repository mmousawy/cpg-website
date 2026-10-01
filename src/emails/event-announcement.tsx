import { Link, Section } from '@react-email/components';

import { Database } from '@/database.types';

import EmailButton from './components/EmailButton';
import EmailDivider from './components/EmailDivider';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import EventDetails from './components/EventDetails';
import { emailAccentLinkStyle } from './components/styles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const EventAnnouncementEmail = ({
  preview,
  fullName,
  recipientEmail,
  event,
  eventLink,
  optOutLink,
}: {
  preview?: boolean;
  fullName: string,
  recipientEmail?: string,
  event: Database['public']['Tables']['events']['Row'],
  eventLink: string,
  optOutLink?: string,
}) => {
  if (preview) {
    fullName = 'John Doe';
    recipientEmail = 'john.doe@example.com';

    event = {
      title: 'Contours, compositions and cropping',
      description: 'Let\'s kick off the new year with inspiration and creativity at our first meetup of 2025! Join us as Murtada hosts and delivers an engaging short talk on "Contours, Compositions, and Cropping," exploring essential techniques to refine your photography. \r\n\r\nLet\'s make 2025 the year of stunning shots and creative growth—see you there!',
      date: '2025-01-25',
      time: '13:00:00',
      location: 'The Tea Lab\r\nNieuwe Binnenweg 178 A\r\nNetherlands',
      cover_image: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/Murtada-al-Mousawy-20241214-DC4A4303.jpg',
    } as Database['public']['Tables']['events']['Row'];

    eventLink = `${baseUrl}/events/contours-compositions-and-cropping`;
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  }

  const previewText = `New event: ${event?.title}`;

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
      optOutLink={optOutLink}
      emailType="events"
    >
      <EmailHeading>
        New event:
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
        We&apos;re excited to announce a new photography meetup! Join us for an inspiring session with fellow photographers.
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={eventLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          View event details
        </EmailButton>
      </Section>
      <EmailText>
        or copy and paste this URL into your browser:
        {' '}
        <Link
          href={eventLink}
          style={emailAccentLinkStyle}
        >
          {eventLink}
        </Link>
      </EmailText>

      <EmailDivider />

      <EventDetails
        event={event}
      />
    </EmailLayout>
  );
};

export default EventAnnouncementEmail;
