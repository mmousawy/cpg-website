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

import Footer from './components/Footer';
import EmailHeader from './components/Header';
import { getEmailSiteUrl } from './utils/siteUrl';

export const OnboardingReminderEmail = ({
  preview,
  fullName,
  onboardingLink,
  contactLink,
}: {
  preview?: boolean;
  fullName?: string | null;
  onboardingLink?: string;
  contactLink?: string;
}) => {
  const siteUrl = getEmailSiteUrl();

  if (preview) {
    fullName = 'Jane';
    onboardingLink = `${siteUrl}/onboarding`;
    contactLink = `${siteUrl}/contact`;
  }

  const greetingName = fullName?.trim() || null;
  const greeting = greetingName ? `Hey ${greetingName},` : 'Hey,';
  const previewText = "You haven't finished setting up your profile";
  const resolvedOnboardingLink = onboardingLink || `${siteUrl}/onboarding`;
  const resolvedContactLink = contactLink || `${siteUrl}/contact`;

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
              Finish setting up your profile
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              {greeting}
            </Text>
            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              We&apos;ve noticed you haven&apos;t finished setting up your profile. You can still do so by clicking the button below.
            </Text>
            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              If you have any questions, don&apos;t hesitate to
              {' '}
              <Link
                href={resolvedContactLink}
                className="text-[#38785f] no-underline font-medium"
              >
                reach out
              </Link>
              .
            </Text>

            <Section
              className="my-[20px]"
            >
              <Button
                className="rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
                href={resolvedOnboardingLink}
              >
                Finish setting up your profile
              </Button>
            </Section>

            <Footer
              fullName={greetingName || undefined}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default OnboardingReminderEmail;
