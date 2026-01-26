import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

import { CPGEvent } from '@/types/events';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

import EventDetails from './components/EventDetails';
import Footer from './components/Footer';
import EmailHeader from './components/Header';

export const RsvpReminderEmail = ({
  preview,
  fullName,
  event,
  eventLink,
  optOutLink,
}: {
  preview?: boolean;
  fullName: string,
  event: CPGEvent,
  eventLink: string,
  optOutLink?: string,
}) => {
  if (preview) {
    fullName = 'John Doe';

    event = {
      title: 'Contours, compositions and cropping',
      description: 'Let\'s kick off the new year with inspiration and creativity at our first meetup of 2025! Join us as Murtada hosts and delivers an engaging short talk on "Contours, Compositions, and Cropping," exploring essential techniques to refine your photography. \r\n\r\nLet\'s make 2025 the year of stunning shots and creative growth—see you there!',
      date: '2025-01-31',
      time: '13:00:00',
      location: 'The Tea Lab\r\nNieuwe Binnenweg 178 A\r\nNetherlands',
      cover_image: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/Murtada-al-Mousawy-20241214-DC4A4303.jpg',
    } as CPGEvent;

    eventLink = `${baseUrl}/events/contours-compositions-and-cropping`;
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  }

  const previewText = `Reminder: ${event?.title}`;

  return (
    <Html>
      <Head />
      <Preview>
        {previewText}
      </Preview>
      <Tailwind>
        <Body
          className="m-auto bg-[#f7f7f7] p-2 font-sans"
        >
          <Container
            className="mx-auto max-w-[465px] border-separate rounded-lg border border-solid border-[#e5e7ea] bg-white p-5"
          >
            <EmailHeader />

            <Heading
              className="mx-0 mb-[30px] p-0 text-[16px] font-semibold text-[#171717]"
            >
              Reminder:
              {' '}
              {event?.title}
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Hi
              {' '}
              {fullName}
              ,
            </Text>
            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              There&apos;s a photography meetup coming up that you haven&apos;t RSVP&apos;d to yet.
            </Text>

            <Section
              className="my-[20px]"
            >
              <Button
                className="rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
                href={eventLink}
              >
                RSVP now
              </Button>
            </Section>
            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              or copy and paste this URL into your browser:
              {' '}
              <Link
                href={eventLink}
                className="text-blue-600 no-underline"
              >
                {eventLink}
              </Link>
            </Text>

            <Hr
              className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]"
            />

            <EventDetails
              event={event}
            />

            <Footer
              fullName={fullName}
              optOutLink={optOutLink}
              emailType="events"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default RsvpReminderEmail;
