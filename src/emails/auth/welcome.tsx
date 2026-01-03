import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

import EmailHeader from "../components/Header";
import Footer from "../components/Footer";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

export const WelcomeTemplate = ({
  preview,
  fullName,
}: {
  preview?: boolean;
  fullName: string;
}) => {
  if (preview) {
    fullName = "John Doe";
  }

  const previewText = `Welcome to Creative Photography Group!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="m-auto bg-[#f7f7f7] p-8 font-sans">
          <Container className="mx-auto max-w-[465px] border-separate rounded-lg border border-solid border-[#e5e7ea] bg-white p-[20px]">
            <EmailHeader />

            <Heading className="mx-0 mb-[30px] p-0 text-[16px] font-semibold text-[#171717]">
              Welcome to Creative Photography Group! 📸
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Hi {fullName},
            </Text>
            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Your email has been verified and your account is now active. Welcome to our community of photography enthusiasts!
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Here&apos;s what you can do next:
            </Text>

            <ul className="text-[14px] leading-[24px] text-[#171717] pl-4">
              <li className="mb-2">Browse upcoming <Link href={`${baseUrl}/events`} className="text-[#38785f] no-underline font-medium">events and meetups</Link></li>
              <li className="mb-2">Explore <Link href={`${baseUrl}/galleries`} className="text-[#38785f] no-underline font-medium">photo galleries</Link> from the community</li>
              <li className="mb-2">Set up your <Link href={`${baseUrl}/account`} className="text-[#38785f] no-underline font-medium">profile</Link> and create your first album</li>
              <li className="mb-2">Join our <Link href="https://discord.gg/cWQK8udb6p" className="text-[#38785f] no-underline font-medium">Discord server</Link> to connect with other photographers</li>
            </ul>

            <Section className="my-[20px]">
              <Button
                className="rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
                href={`${baseUrl}/events`}
              >
                Browse upcoming events
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              We&apos;re excited to have you join us. See you at the next meetup!
            </Text>

            <Footer fullName={fullName} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default WelcomeTemplate;

