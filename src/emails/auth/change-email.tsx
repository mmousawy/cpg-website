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
  Tailwind,
  Text,
} from "@react-email/components";

import Footer from "../components/Footer";
import EmailHeader from "../components/Header";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

export const ChangeEmailTemplate = ({
  preview,
  fullName,
  newEmail,
  verifyLink,
}: {
  preview?: boolean;
  fullName?: string;
  newEmail: string;
  verifyLink: string;
}) => {
  if (preview) {
    fullName = "John Doe";
    newEmail = "newemail@example.com";
    verifyLink = `${baseUrl}/auth/verify-email-change?token=abc123`;
  }

  const previewText = `Confirm your email change to ${newEmail}`;
  const greeting = fullName ? `Hi ${fullName},` : 'Hi there,';

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="m-auto bg-[#f7f7f7] p-2 font-sans">
          <Container className="mx-auto max-w-[465px] border-separate rounded-lg border border-solid border-[#e5e7ea] bg-white p-5">
            <EmailHeader />

            <Heading className="mx-0 mb-[30px] p-0 text-[16px] font-semibold text-[#171717]">
              Confirm your email change
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              {greeting}
            </Text>
            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Someone requested to change your account email to{" "}
              <strong>{newEmail}</strong>. If this was you, please confirm this change by clicking the button below.
            </Text>

            <Section className="my-[20px]">
              <Button
                className="rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
                href={verifyLink}
              >
                Confirm email change
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Or copy and paste this URL into your browser:{" "}
              <Link href={verifyLink} className="text-blue-600 no-underline">
                {verifyLink}
              </Link>
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#737373] mt-6">
              This link will expire in 24 hours. If you didn&apos;t request this change, you can safely ignore this email and your account will remain unchanged.
            </Text>

            <Footer fullName={fullName} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ChangeEmailTemplate;
