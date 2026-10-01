import EmailDivider from './components/EmailDivider';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';

export const ContactEmail = ({
  preview,
  name,
  email,
  subject,
  message,
}: {
  preview?: boolean;
  name: string;
  email: string;
  subject: string;
  message: string;
}) => {
  if (preview) {
    name = 'John Doe';
    email = 'john.doe@example.com';
    subject = 'Question about the photography group';
    message = 'Hi there!\n\nI was wondering if I could join your photography meetups. I\'m a beginner photographer and would love to learn from the community.\n\nThanks!';
  }

  const previewText = `New contact form submission from ${name}`;

  return (
    <EmailLayout
      previewText={previewText}
      showFooter={false}
      showSocialLinks={false}
    >
      <EmailHeading>
        New contact form submission
      </EmailHeading>

      <EmailText>
        <strong>
          From:
        </strong>
        {' '}
        {name}
      </EmailText>
      <EmailText
        style={{ marginTop: '4px' }}
      >
        <strong>
          Email:
        </strong>
        {' '}
        {email}
      </EmailText>
      <EmailText
        style={{ marginTop: '4px' }}
      >
        <strong>
          Subject:
        </strong>
        {' '}
        {subject}
      </EmailText>

      <EmailDivider />

      <EmailText>
        <strong>
          Message:
        </strong>
      </EmailText>
      <EmailText
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {message}
      </EmailText>

      <EmailDivider />

      <EmailText
        variant="muted"
      >
        This message was sent via the Creative Photography Group contact form.
        Reply directly to this email to respond to the sender.
      </EmailText>
    </EmailLayout>
  );
};

export default ContactEmail;
