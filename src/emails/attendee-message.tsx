import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components";

import { Database } from '@/database.types';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

import EventDetails from "./components/EventDetails";
import Footer from "./components/Footer";
import EmailHeader from "./components/Header";

export const AttendeeMessageEmail = ({
  preview,
  fullName,
  event,
  message,
  eventLink,
  optOutLink,
}: {
  preview?: boolean;
  fullName: string,
  event: Database['public']['Tables']['events']['Row'],
  message: string,
  eventLink: string,
  optOutLink?: string,
}) => {
  if (preview) {
    fullName = "John Doe";
    message = "This is a sample message from the event organizers. We're looking forward to seeing everyone at the meetup!";

    event = {
      title: "Contours, compositions and cropping",
      description: `Let's kick off the new year with inspiration and creativity at our first meetup of 2025! Join us as Murtada hosts and delivers an engaging short talk on "Contours, Compositions, and Cropping," exploring essential techniques to refine your photography. \r\n\r\nLet's make 2025 the year of stunning shots and creative growth—see you there!`,
      date: "2025-01-25",
      time: "13:00:00",
      location: "The Tea Lab\r\nNieuwe Binnenweg 178 A\r\nRotterdam",
      cover_image: `https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/Murtada-al-Mousawy-20241214-DC4A4303.jpg`,
    } as Database['public']['Tables']['events']['Row'];

    eventLink = `${baseUrl}/events/contours-compositions-and-cropping`;
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  }

  const previewText = `Message about: ${event?.title}`;

  // Convert line breaks to HTML breaks
  const formattedMessage = message.split('\n').map((line, i) => (
    <Text key={i} className="text-[14px] leading-[24px] text-[#171717]">
      {line || '\u00A0'}
    </Text>
  ));

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="m-auto bg-[#f7f7f7] p-2 font-sans">
          <Container className="mx-auto max-w-[465px] border-separate rounded-lg border border-solid border-[#e5e7ea] bg-white p-5">
            <EmailHeader />

            <Heading className="mx-0 mb-[30px] p-0 text-[16px] font-semibold text-[#171717]">
              Update about: {event?.title}
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Hi {fullName},
            </Text>

            <Hr className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]" />

            {/* Custom message from admin */}
            <div className="my-[20px] rounded-lg bg-[#f7f7f7] p-4">
              {formattedMessage}
            </div>

            <Hr className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]" />

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              View event details:{" "}
              <Link href={eventLink} className="text-blue-600 no-underline">
                {eventLink}
              </Link>
            </Text>

            <Hr className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]" />

            <EventDetails event={event} noDescription />

            <Footer fullName={fullName} optOutLink={optOutLink} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AttendeeMessageEmail;
