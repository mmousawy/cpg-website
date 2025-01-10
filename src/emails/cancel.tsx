import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Tailwind,
} from "@react-email/components";

import { Database } from '@/database.types';

import EmailHeader from "./components/Header";
import Footer from "./components/Footer";

export const CancelEmail = ({
  preview,
  fullName,
  event,
}: {
  preview?: boolean;
  fullName: string,
  event: Database['public']['Tables']['events']['Row'],
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
  }

  const previewText = `You've canceled your RSVP`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="m-auto bg-[#f7f7f7] p-8 font-sans">
          <Container className="mx-auto max-w-[465px] border-separate rounded-lg border border-solid border-[#e5e7ea] bg-white p-[20px]">
            <EmailHeader />

            <Heading className="mx-0 mb-[30px] p-0 text-[16px] font-semibold text-[#171717]">
              Canceled RSVP: {event?.title}
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Hi {fullName},
            </Text>
            <Text className="text-[14px] leading-[24px] text-[#171717]">
              You&apos;ve canceled your RSVP for the meetup &quot;{event.title}&quot; on {new Date(event.date!).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}. We&apos;ll be missing you!
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              If you change your mind, you can always sign up again.
            </Text>

            <Footer fullName={fullName} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default CancelEmail;
