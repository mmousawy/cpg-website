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

export const SignupEmail = ({
  preview,
  fullName,
  recipientEmail,
  event,
  confirmLink,
}: {
  preview?: boolean;
  fullName: string,
  recipientEmail?: string,
  event: Database['public']['Tables']['events']['Row'],
  confirmLink: string,
}) => {
  if (preview) {
    fullName = 'John Doe';
    recipientEmail = 'john.doe@example.com';

    event = {
      title: 'Contours, compositions and cropping',
      description: 'Let\'s kick off the new year with inspiration and creativity at our first meetup of 2025! Join us as Murtada hosts and delivers an engaging short talk on "Contours, Compositions, and Cropping," exploring essential techniques to refine your photography. \r\n\r\nLet\'s make 2025 the year of stunning shots and creative growth—see you there!',
      date: new Date('2025-01-25').toString(),
      time: '13:00:00',
      location: 'The Tea Lab\r\nNieuwe Binnenweg 178 A\r\nNetherlands',
      cover_image: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/Murtada-al-Mousawy-20241214-DC4A4303.jpg',
    } as Database['public']['Tables']['events']['Row'];

    confirmLink = `${baseUrl}/confirm/123456`;
  }

  const previewText = 'Confirm your sign up for the meetup';

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        Sign up for:
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
        Someone recently signed up for the mentioned meetup with your email address.
        If this was you, you can confirm or cancel your sign up here:
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={confirmLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          Confirm sign up
        </EmailButton>
      </Section>
      <EmailText>
        or copy and paste this URL into your browser:
        {' '}
        <Link
          href={confirmLink}
          style={emailAccentLinkStyle}
        >
          {confirmLink}
        </Link>
      </EmailText>

      <EmailDivider />

      <EventDetails
        event={event}
      />
    </EmailLayout>
  );
};

export default SignupEmail;
