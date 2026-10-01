import { Link, Section } from '@react-email/components';

import EmailButton from '../components/EmailButton';
import EmailHeading from '../components/EmailHeading';
import EmailLayout from '../components/EmailLayout';
import EmailText from '../components/EmailText';
import { emailAccentLinkStyle } from '../components/styles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const ResetPasswordTemplate = ({
  preview,
  fullName,
  recipientEmail,
  resetLink,
}: {
  preview?: boolean;
  fullName: string;
  recipientEmail?: string;
  resetLink: string;
}) => {
  if (preview) {
    fullName = 'John Doe';
    recipientEmail = 'john.doe@example.com';
    resetLink = `${baseUrl}/reset-password?token=abc123`;
  }

  const previewText = 'Reset your password';

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        Reset your password
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {fullName}
        ,
      </EmailText>
      <br />
      <EmailText>
        We received a request to reset your password for your Creative Photography Group account. Click the button below to choose a new password.
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={resetLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          Reset password
        </EmailButton>
      </Section>

      <EmailText>
        Or copy and paste this URL into your browser:
        {' '}
        <Link
          href={resetLink}
          style={emailAccentLinkStyle}
        >
          {resetLink}
        </Link>
      </EmailText>

      <EmailText
        variant="muted"
        style={{ marginTop: '24px' }}
      >
        This link will expire in 1 hour. If you didn&apos;t request a password reset, you can safely ignore this email.
      </EmailText>
    </EmailLayout>
  );
};

export default ResetPasswordTemplate;
