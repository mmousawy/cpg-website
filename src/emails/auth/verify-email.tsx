import { Link, Section } from '@react-email/components';

import EmailButton from '../components/EmailButton';
import EmailHeading from '../components/EmailHeading';
import EmailLayout from '../components/EmailLayout';
import EmailText from '../components/EmailText';
import { emailAccentLinkStyle } from '../components/styles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const VerifyEmailTemplate = ({
  preview,
  fullName,
  recipientEmail,
  verifyLink,
}: {
  preview?: boolean;
  fullName?: string;
  recipientEmail?: string;
  verifyLink: string;
}) => {
  if (preview) {
    fullName = 'John Doe';
    recipientEmail = 'john.doe@example.com';
    verifyLink = `${baseUrl}/auth/verify-email?token=abc123`;
  }

  const previewText = 'Verify your email address';
  const greeting = fullName ? `Hi ${fullName},` : 'Hi there,';

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        Verify your email address
      </EmailHeading>

      <EmailText>
        {greeting}
      </EmailText>
      <br />
      <EmailText>
        Thanks for signing up for Creative Photography Group! Please verify your email address by clicking the button below.
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={verifyLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          Verify email address
        </EmailButton>
      </Section>

      <EmailText>
        Or copy and paste this URL into your browser:
        {' '}
        <Link
          href={verifyLink}
          style={emailAccentLinkStyle}
        >
          {verifyLink}
        </Link>
      </EmailText>

      <EmailText
        variant="muted"
        style={{ marginTop: '24px' }}
      >
        This link will expire in 24 hours. If you didn&apos;t create an account, you can safely ignore this email.
      </EmailText>
    </EmailLayout>
  );
};

export default VerifyEmailTemplate;
