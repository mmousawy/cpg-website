import EmailButton from './components/EmailButton';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const AdminSuspensionDeletionScheduledEmail = ({
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

  const previewText = 'Your account is suspended';

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        Account suspended — scheduled for deletion
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {fullName}
        ,
      </EmailText>
      <br />

      <EmailText>
        An administrator has suspended your Creative Photography Group account. Unless your suspension is lifted,
        your account and content will be permanently removed on
        {' '}
        <strong>{deletionDate}</strong>
        .
      </EmailText>

      <EmailText>
        Signing in will not restore a suspended account. If you believe this is a mistake, contact us through our
        website and refer to this message.
      </EmailText>

      <EmailButton
        href={`${baseUrl}/contact`}
        variant="secondary"
        style={{ marginTop: '12px' }}
      >
        Contact us
      </EmailButton>
    </EmailLayout>
  );
};

export default AdminSuspensionDeletionScheduledEmail;
