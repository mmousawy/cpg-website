import { socialLinks } from '@/config/socials';
import { Database } from '@/database.types';

import AddToCalendar from '@/components/events/AddToCalendar';
import EmailButton from './components/EmailButton';
import EmailDivider from './components/EmailDivider';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import EventDetails from './components/EventDetails';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
const whatsAppGroupUrl = socialLinks.find((link) => link.name === 'WhatsApp')?.url ?? '';

export const ConfirmEmail = ({
  preview,
  fullName,
  recipientEmail,
  event,
  cancellationLink,
}: {
  preview?: boolean;
  fullName: string,
  recipientEmail?: string,
  event: Database['public']['Tables']['events']['Row'],
  cancellationLink: string,
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

    cancellationLink = `${baseUrl}/cancel/123456`;
  }

  const previewText = 'You\'ve confirmed your RSVP';

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        Confirmed RSVP:
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
        Awesome, you&apos;re signed up for the event!
        <br />
        We look forward to seeing you there.
      </EmailText>

      <EmailDivider />

      <EventDetails
        event={event}
        noDescription={!preview}
      />

      <EmailDivider
        spacing="tight"
      />

      <EmailHeading
        variant="section"
      >
        Stay updated
      </EmailHeading>
      <EmailText>
        Join the WhatsApp group to stay updated on the event and connect with other attendees.
        <br />
        <EmailButton
          href={whatsAppGroupUrl}
          variant="primary"
        >
          Join WhatsApp
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="48 -912 864 864"
            fill="#ffffff"
            aria-hidden="true"
          >
            <path
              d="m243-240-51-51 405-405H240v-72h480v480h-72v-357L243-240Z"
            />
          </svg>
        </EmailButton>
      </EmailText>

      <EmailHeading
        variant="sectionLoose"
      >
        Can&apos;t make it?
      </EmailHeading>
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

      <AddToCalendar
        event={event}
        render="email"
      />
    </EmailLayout>
  );
};

export default ConfirmEmail;
