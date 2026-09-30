import { Link, Section } from '@react-email/components';

import EmailButton from './components/EmailButton';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import { emailAccentLinkStyle } from './components/styles';
import { getEmailSiteUrl } from './utils/siteUrl';

export const OnboardingReminderEmail = ({
  preview,
  fullName,
  recipientEmail,
  onboardingLink,
  contactLink,
}: {
  preview?: boolean;
  fullName?: string | null;
  recipientEmail?: string;
  onboardingLink?: string;
  contactLink?: string;
}) => {
  const siteUrl = getEmailSiteUrl();

  if (preview) {
    fullName = 'Jane';
    recipientEmail = 'jane.doe@example.com';
    onboardingLink = `${siteUrl}/onboarding`;
    contactLink = `${siteUrl}/contact`;
  }

  const greetingName = fullName?.trim() || null;
  const greeting = greetingName ? `Hey ${greetingName},` : 'Hey,';
  const previewText = "You haven't finished setting up your profile";
  const resolvedOnboardingLink = onboardingLink || `${siteUrl}/onboarding`;
  const resolvedContactLink = contactLink || `${siteUrl}/contact`;

  return (
    <EmailLayout
      previewText={previewText}
      fullName={greetingName || undefined}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        Finish setting up your profile
      </EmailHeading>

      <EmailText>
        {greeting}
      </EmailText>
      <br />
      <EmailText>
        We&apos;ve noticed you haven&apos;t finished setting up your profile. You can still do so by clicking the button below.
      </EmailText>
      <EmailText>
        If you have any questions, don&apos;t hesitate to
        {' '}
        <Link
          href={resolvedContactLink}
          style={{ ...emailAccentLinkStyle, textDecoration: 'none', fontWeight: 500 }}
        >
          reach out
        </Link>
        .
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={resolvedOnboardingLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          Finish setting up your profile
        </EmailButton>
      </Section>
    </EmailLayout>
  );
};

export default OnboardingReminderEmail;
