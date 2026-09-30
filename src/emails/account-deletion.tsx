import { Section } from '@react-email/components';

import EmailButton from './components/EmailButton';
import EmailDivider from './components/EmailDivider';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import { emailListItemStyle, emailListStyle } from './components/styles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const AccountDeletionEmail = ({
  preview,
  fullName,
  recipientEmail,
  deletionDate,
}: {
  preview?: boolean;
  fullName: string;
  recipientEmail?: string;
  deletionDate: string;
}) => {
  if (preview) {
    fullName = 'John Doe';
    recipientEmail = 'john.doe@example.com';
    deletionDate = 'April 9, 2026';
  }

  const previewText = 'Your account is scheduled for deletion';

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        Account scheduled for deletion
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {fullName}
        ,
      </EmailText>
      <br />

      <EmailText>
        Your Creative Photography Group account has been scheduled for deletion. Here&apos;s what happens next:
      </EmailText>

      <EmailText>
        <strong>
          Immediately:
        </strong>
      </EmailText>
      <ul
        style={emailListStyle}
      >
        <li
          style={emailListItemStyle}
        >
          You have been signed out and can no longer log in
        </li>
        <li
          style={emailListItemStyle}
        >
          Your content is hidden from other users
        </li>
      </ul>

      <EmailText>
        <strong>
          On
          {' '}
          {deletionDate}
          :
        </strong>
      </EmailText>
      <ul
        style={emailListStyle}
      >
        <li
          style={emailListItemStyle}
        >
          Your profile and account information will be permanently deleted
        </li>
        <li
          style={emailListItemStyle}
        >
          All your photos (including photos contributed to shared albums) will be removed
        </li>
        <li
          style={emailListItemStyle}
        >
          Your albums, comments, likes, and all other activity will be removed
        </li>
        <li
          style={emailListItemStyle}
        >
          Your stored files will be permanently deleted from our servers
        </li>
      </ul>

      <EmailDivider />

      <EmailHeading
        variant="section"
        style={{ marginTop: 0 }}
      >
        Changed your mind?
      </EmailHeading>
      <EmailText>
        If you want to keep your account, please contact us before
        {' '}
        {deletionDate}
        {' '}
        through our contact form and we&apos;ll cancel the deletion:
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={`${baseUrl}/contact`}
          variant="secondary"
          style={{ marginTop: 0 }}
        >
          Contact us
        </EmailButton>
      </Section>
    </EmailLayout>
  );
};

export default AccountDeletionEmail;
