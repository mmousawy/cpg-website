import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Tailwind,
  Text,
} from '@react-email/components';

import EmailHeader from './components/Header';

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
              New contact form submission
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              <strong>
                From:
              </strong>
              {' '}
              {name}
            </Text>
            <Text
              className="mt-1! text-[14px] leading-[24px] text-[#171717]"
            >
              <strong>
                Email:
              </strong>
              {' '}
              {email}
            </Text>
            <Text
              className="mt-1! text-[14px] leading-[24px] text-[#171717]"
            >
              <strong>
                Subject:
              </strong>
              {' '}
              {subject}
            </Text>

            <Hr
              className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]"
            />

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              <strong>
                Message:
              </strong>
            </Text>
            <Text
              className="whitespace-pre-wrap text-[14px] leading-[24px] text-[#171717]"
            >
              {message}
            </Text>

            <Hr
              className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]"
            />

            <Text
              className="text-[12px] leading-[24px] text-[#666666]"
            >
              This message was sent via the Creative Photography Group contact form.
              Reply directly to this email to respond to the sender.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ContactEmail;
