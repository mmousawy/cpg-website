import EmailButton from './components/EmailButton';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const InactivityDeletionScheduledEmail = ({
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

  const previewText = 'Sign in to keep your account';

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        We will delete your inactive account
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {fullName}
        ,
      </EmailText>
      <br />

      <EmailText>
        Your Creative Photography Group account has been inactive for a long time. We have scheduled it for
        permanent deletion on
        {' '}
        <strong>{deletionDate}</strong>
        .
      </EmailText>

      <EmailText>
        <strong>
          Sign in before that date
        </strong>
        {' '}
        to cancel the deletion and restore access. Your profile and content are hidden until then.
      </EmailText>

      <EmailButton
        href={`${baseUrl}/login`}
        variant="primary"
        style={{ marginTop: '12px' }}
      >
        Sign in
      </EmailButton>

      <EmailText
        style={{ marginTop: '24px', fontSize: '14px', color: '#64748b' }}
      >
        If you no longer want your account, you can ignore this email.
      </EmailText>
    </EmailLayout>
  );
};

export default InactivityDeletionScheduledEmail;
