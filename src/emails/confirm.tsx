import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
  Tailwind,
} from "@react-email/components";

import { Database } from "../../database.types";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

import EmailHeader from "./components/Header";
import EventDetails from "./components/EventDetails";
import Footer from "./components/Footer";

export const ConfirmEmail = ({
  preview,
  fullName,
  event,
  cancellationLink,
}: {
  preview?: boolean;
  fullName: string,
  event: Database['public']['Tables']['events']['Row'],
  cancellationLink: string,
}) => {
  if (preview) {
    fullName = "John Doe";

    event = {
      title: "Contours, compositions and cropping",
      description: `Let's kick off the new year with inspiration and creativity at our first meetup of 2025! Join us as Murtada hosts and delivers an engaging short talk on "Contours, Compositions, and Cropping," exploring essential techniques to refine your photography. \r\n\r\nLet's make 2025 the year of stunning shots and creative growth—see you there!`,
      date: new Date('2025-01-25').toString(),
      time: "13:00:00",
      location: "The Tea Lab\r\nNieuwe Binnenweg 178 A\r\nRotterdam",
      cover_image: `https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/Murtada-al-Mousawy-20241214-DC4A4303.jpg`,
    } as Database['public']['Tables']['events']['Row'];

    cancellationLink = `${baseUrl}/cancel/123456`;
  }

  const previewText = `Confirmed RSVP for: ${event?.title}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="m-auto bg-[#f7f7f7] p-8 font-sans">
          <Container className="mx-auto max-w-[465px] border-separate rounded border border-solid border-[#e5e7ea] bg-white p-[20px]">
            <EmailHeader />

            <Heading className="mx-0 mb-[30px] p-0 text-[16px] font-semibold text-[#171717]">
              Confirmed RSVP: {event?.title}
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Hi {fullName},
            </Text>
            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Awesome, You&apos;re signed up for the event!<br />
              We look forward to seeing you there.
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Need to cancel your RSVP? You can do that by clicking here:<br />
              <Link href={cancellationLink} className="text-blue-600 no-underline">Cancel RSVP</Link>
            </Text>

            <Hr className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]" />

            <EventDetails event={event} noDescription />

            <Footer fullName={fullName} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ConfirmEmail;
