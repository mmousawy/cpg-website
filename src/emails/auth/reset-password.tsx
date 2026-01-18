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
} from '@react-email/components';

import Footer from '../components/Footer';
import EmailHeader from '../components/Header';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const ResetPasswordTemplate = ({
  preview,
  fullName,
  resetLink,
}: {
  preview?: boolean;
  fullName: string;
  resetLink: string;
}) => {
  if (preview) {
    fullName = 'John Doe';
    resetLink = `${baseUrl}/reset-password?token=abc123`;
  }

  const previewText = 'Reset your password';

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
              Reset your password
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
              We received a request to reset your password for your Creative Photography Group account. Click the button below to choose a new password.
            </Text>

            <Section
              className="my-[20px]"
            >
              <Button
                className="rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
                href={resetLink}
              >
                Reset password
              </Button>
            </Section>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Or copy and paste this URL into your browser:
              {' '}
              <Link
                href={resetLink}
                className="text-blue-600 no-underline"
              >
                {resetLink}
              </Link>
            </Text>

            <Text
              className="text-[14px] leading-[24px] text-[#737373] mt-6"
            >
              This link will expire in 1 hour. If you didn&apos;t request a password reset, you can safely ignore this email.
            </Text>

            <Footer
              fullName={fullName}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ResetPasswordTemplate;
