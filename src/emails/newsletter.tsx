import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Tailwind,
  Text,
} from '@react-email/components';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

import Footer from './components/Footer';
import EmailHeader from './components/Header';
import RichContent from './components/RichContent';

export const NewsletterEmail = ({
  preview,
  subject,
  body,
  fullName,
  optOutLink,
}: {
  preview?: boolean;
  subject: string;
  body: string;
  fullName: string;
  optOutLink?: string;
}) => {
  if (preview) {
    fullName = 'John Doe';
    subject = 'What\'s new on Creative Photography Group';
    body = '<p>We\'ve been busy building new features and we\'re excited to share what\'s new!</p><h2>Photo Challenges</h2><p>Photo Challenges are <strong>themed creative prompts</strong> designed to push your photography in new directions. Submit your best shots and see your work featured in the challenge gallery.</p><p>Head to the <a href="/challenges">Challenges page</a> to see what\'s currently running.</p><h2>Shared Albums</h2><p>Albums can now be <strong>collaborative</strong>. Create a shared album, invite other members, and build a collection together.</p><p>Thank you for being part of <em>Creative Photography Group</em>. We\'re glad you\'re here.</p>';
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  }

  const previewText = subject;

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
              {subject}
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Hi
              {' '}
              {fullName}
              ,
            </Text>

            <RichContent
              html={body}
            />

            <Footer
              fullName={fullName}
              optOutLink={optOutLink}
              emailType="newsletter"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default NewsletterEmail;
