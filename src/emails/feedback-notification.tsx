import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

import Footer from './components/Footer';
import EmailHeader from './components/Header';
import { FEEDBACK_SUBJECTS } from '@/types/feedback';

export const FeedbackNotificationEmail = ({
  preview,
  adminName,
  submitterName,
  submitterEmail,
  subject,
  message,
  screenshots,
  reviewLink,
  optOutLink,
}: {
  preview?: boolean;
  adminName: string;
  submitterName: string;
  submitterEmail: string | null;
  subject: string;
  message: string;
  screenshots?: string[] | null;
  reviewLink: string;
  optOutLink?: string;
}) => {
  if (preview) {
    adminName = 'Admin User';
    submitterName = 'John Smith';
    submitterEmail = 'john@example.com';
    subject = 'general';
    message = 'I really love the new gallery feature! It would be great if you could add dark mode support as well.';
    reviewLink = 'https://example.com/admin/feedback';
    optOutLink = 'https://example.com/unsubscribe/preview-token';
  }

  const subjectLabel = FEEDBACK_SUBJECTS.find((s) => s.value === subject)?.label ?? subject;
  const previewText = `New feedback from ${submitterName}: ${subjectLabel}`;

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
              New feedback received
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Hi
              {' '}
              {adminName}
              ,
            </Text>
            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              New feedback has been submitted and is waiting for review.
            </Text>

            <Section
              className="my-[20px] rounded-lg border border-[#e5e7ea] bg-[#f7f7f7] p-4"
            >
              <Text
                className="my-0! mb-1! text-[12px] font-semibold uppercase leading-[16px] text-[#666666]"
              >
                From
              </Text>
              <Text
                className="my-0! mb-2! text-[14px] font-semibold leading-[20px] text-[#171717]"
              >
                {submitterName}
              </Text>
              {submitterEmail && (
                <Text
                  className="my-0! text-[12px] leading-[16px] text-[#666666]"
                >
                  {submitterEmail}
                </Text>
              )}
            </Section>

            <Section
              className="my-[20px] rounded-lg border border-[#e5e7ea] p-4"
            >
              <Text
                className="my-0! mb-1! text-[12px] font-semibold uppercase leading-[16px] text-[#666666]"
              >
                Subject
              </Text>
              <Text
                className="my-0! mb-4! text-[14px] font-semibold leading-[20px] text-[#171717]"
              >
                {subjectLabel}
              </Text>
              <Text
                className="my-0! mb-2! text-[12px] font-semibold uppercase leading-[16px] text-[#666666]"
              >
                Message
              </Text>
              <Text
                className="my-0! whitespace-pre-wrap text-[14px] leading-[20px] text-[#171717]"
              >
                {message}
              </Text>
              {screenshots && screenshots.length > 0 && (
                <div
                  className="mt-4"
                >
                  <Text
                    className="my-0! mb-2! text-[12px] font-semibold uppercase leading-[16px] text-[#666666]"
                  >
                    Screenshots
                  </Text>
                  <div
                    className="flex gap-2 flex-wrap"
                  >
                    {screenshots.map((url, i) => (
                      <Link
                        key={url}
                        href={url}
                        className="text-[12px] text-[#38785f] underline"
                      >
                        Screenshot
                        {' '}
                        {i + 1}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            <div
              className="my-[20px]"
            >
              <Link
                href={reviewLink}
                className="inline-block rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
              >
                Review feedback
              </Link>
            </div>

            <Footer
              fullName={adminName}
              optOutLink={optOutLink}
              emailType="admin_notifications"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default FeedbackNotificationEmail;
