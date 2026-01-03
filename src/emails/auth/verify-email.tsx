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

export const VerifyEmailTemplate = ({
  preview,
  fullName,
  verifyLink,
}: {
  preview?: boolean;
  fullName: string;
  verifyLink: string;
}) => {
  if (preview) {
    fullName = "John Doe";
    verifyLink = `${baseUrl}/auth/verify-email?token=abc123`;
  }

  const previewText = `Verify your email address`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="m-auto bg-[#f7f7f7] p-8 font-sans">
          <Container className="mx-auto max-w-[465px] border-separate rounded-lg border border-solid border-[#e5e7ea] bg-white p-[20px]">
            <EmailHeader />

            <Heading className="mx-0 mb-[30px] p-0 text-[16px] font-semibold text-[#171717]">
              Verify your email address
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Hi {fullName},
            </Text>
            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Thanks for signing up for Creative Photography Group! Please verify your email address by clicking the button below.
            </Text>

            <Section className="my-[20px]">
              <Button
                className="rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
                href={verifyLink}
              >
                Verify email address
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Or copy and paste this URL into your browser:{" "}
              <Link href={verifyLink} className="text-blue-600 no-underline">
                {verifyLink}
              </Link>
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#737373] mt-6">
              This link will expire in 24 hours. If you didn&apos;t create an account, you can safely ignore this email.
            </Text>

            <Footer fullName={fullName} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default VerifyEmailTemplate;

