import { Database } from '@/database.types';

import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';

export const CancelEmail = ({
  preview,
  fullName,
  recipientEmail,
  event,
}: {
  preview?: boolean;
  fullName: string,
  recipientEmail?: string,
  event: Database['public']['Tables']['events']['Row'],
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
  }

  const previewText = 'You\'ve canceled your RSVP';

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        Canceled RSVP:
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
        You&apos;ve canceled your RSVP for the meetup &quot;{event.title}&quot;
        {' '}
        on
        {' '}
        {new Date(event.date!).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        . We&apos;ll be missing you!
      </EmailText>

      <br />
      <EmailText>
        If you change your mind, you can always sign up again.
      </EmailText>
    </EmailLayout>
  );
};

export default CancelEmail;
