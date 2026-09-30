const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import RichContent from './components/RichContent';

export const NewsletterEmail = ({
  preview,
  subject,
  body,
  fullName,
  recipientEmail,
  optOutLink,
}: {
  preview?: boolean;
  subject: string;
  body: string;
  fullName: string;
  recipientEmail?: string;
  optOutLink?: string;
}) => {
  if (preview) {
    fullName = 'John Doe';
    recipientEmail = 'john.doe@example.com';
    subject = 'What\'s new on Creative Photography Group';
    body = '<p>We\'ve been busy building new features and we\'re excited to share what\'s new!</p><h2>Photo Challenges</h2><p>Photo Challenges are <strong>themed creative prompts</strong> designed to push your photography in new directions. Submit your best shots and see your work featured in the challenge gallery.</p><p>Head to the <a href="/challenges">Challenges page</a> to see what\'s currently running.</p><h2>Shared Albums</h2><p>Albums can now be <strong>collaborative</strong>. Create a shared album, invite other members, and build a collection together.</p><p>Thank you for being part of <em>Creative Photography Group</em>. We\'re glad you\'re here.</p>';
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  }

  const previewText = subject;

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
      optOutLink={optOutLink}
      emailType="newsletter"
    >
      <EmailHeading>
        {subject}
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {fullName}
        ,
      </EmailText>
      <br />

      <RichContent
        html={body}
      />
    </EmailLayout>
  );
};

export default NewsletterEmail;
