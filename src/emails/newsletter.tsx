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
    subject = 'Newsletter: Creative Photography Group Update';
    body = "Hi everyone!\n\nWe're excited to share our latest news and updates with you. This is a sample newsletter to show how your message will appear.\n\nThank you for being part of our community!";
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  }

  const previewText = subject;

  // Convert line breaks to HTML breaks
  const formattedBody = body.split('\n').map((line, i) => (
    <Text
      key={i}
      className="text-[14px] leading-[24px] text-[#171717]"
    >
      {line || '\u00A0'}
    </Text>
  ));

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

            <div
              className="my-[20px] rounded-lg bg-[#f7f7f7] p-4"
            >
              {formattedBody}
            </div>

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
