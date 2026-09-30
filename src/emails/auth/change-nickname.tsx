import { Link, Section } from '@react-email/components';

import EmailButton from '../components/EmailButton';
import EmailHeading from '../components/EmailHeading';
import EmailLayout from '../components/EmailLayout';
import EmailText from '../components/EmailText';
import { emailAccentLinkStyle } from '../components/styles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const ChangeNicknameTemplate = ({
  preview,
  fullName,
  recipientEmail,
  currentNickname,
  newNickname,
  verifyLink,
}: {
  preview?: boolean;
  fullName?: string;
  recipientEmail?: string;
  currentNickname: string;
  newNickname: string;
  verifyLink: string;
}) => {
  if (preview) {
    fullName = 'John Doe';
    recipientEmail = 'john.doe@example.com';
    currentNickname = 'johndoe';
    newNickname = 'john-photo';
    verifyLink = `${baseUrl}/auth/verify-nickname-change?token=abc123`;
  }

  const previewText = `Confirm your nickname change to @${newNickname}`;
  const greeting = fullName ? `Hi ${fullName},` : 'Hi there,';

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        Confirm your nickname change
      </EmailHeading>

      <EmailText>
        {greeting}
      </EmailText>
      <br />
      <EmailText>
        Someone requested to change your account nickname from
        {' '}
        <strong>
          @{currentNickname}
        </strong>
        {' '}
        to
        {' '}
        <strong>
          @{newNickname}
        </strong>
        . If this was you, please confirm this change by clicking the button below.
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={verifyLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          Confirm nickname change
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
        This link will expire in 24 hours. Your profile URL will change and old links to
        {' '}
        @{currentNickname}
        {' '}
        will redirect for one year. If you didn&apos;t request this change, you can safely
        ignore this email and your nickname will remain unchanged.
      </EmailText>
    </EmailLayout>
  );
};

export default ChangeNicknameTemplate;
