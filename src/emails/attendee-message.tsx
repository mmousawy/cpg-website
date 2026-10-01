import { Link, Section } from '@react-email/components';

import { Database } from '@/database.types';

import EmailDivider from './components/EmailDivider';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import EventDetails from './components/EventDetails';
import RichContent from './components/RichContent';
import { emailAccentLinkStyle, emailCalloutStyle } from './components/styles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const AttendeeMessageEmail = ({
  preview,
  fullName,
  recipientEmail,
  event,
  message,
  eventLink,
  optOutLink,
}: {
  preview?: boolean;
  fullName: string,
  recipientEmail?: string,
  event: Database['public']['Tables']['events']['Row'],
  message: string,
  eventLink: string,
  optOutLink?: string,
}) => {
  if (preview) {
    fullName = 'John Doe';
    recipientEmail = 'john.doe@example.com';
    message = '<p>This is a sample message from the event organizers.</p><p>We\'re looking forward to seeing everyone at the meetup! Feel free to <strong>bring your camera</strong> and share your photos.</p>';

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

  const previewText = `Message about: ${event?.title}`;

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
      optOutLink={optOutLink}
      emailType="events"
    >
      <EmailHeading>
        Update about:
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
        The organizers of this event have an update for you:
      </EmailText>

      <Section
        style={{ ...emailCalloutStyle, margin: '20px 0' }}
      >
        <RichContent
          html={message}
        />
      </Section>

      <EmailText>
        View event details:
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
        noDescription
      />
    </EmailLayout>
  );
};

export default AttendeeMessageEmail;
