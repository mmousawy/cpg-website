import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

import Footer from './components/Footer';
import EmailHeader from './components/Header';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

type ChallengeData = {
  title: string;
  prompt: string;
  ends_at: string | null;
  cover_image_url: string | null;
};

export const ChallengeAnnouncementEmail = ({
  preview,
  fullName,
  challenge,
  challengeLink,
  optOutLink,
}: {
  preview?: boolean;
  fullName: string;
  challenge: ChallengeData;
  challengeLink: string;
  optOutLink?: string;
}) => {
  if (preview) {
    fullName = 'John Doe';
    challenge = {
      title: 'Golden Hour Challenge',
      prompt:
        'Capture the magic of golden hour! We want to see your best shots taken during that magical time just after sunrise or before sunset. Show us warm tones, long shadows, and dreamy light.',
      ends_at: '2026-03-01T23:59:59Z',
      cover_image_url:
        'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800',
    };
    challengeLink = `${baseUrl}/challenges/golden-hour-challenge`;
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  }

  const previewText = `New Photo Challenge: ${challenge?.title}`;

  // Format deadline
  const formatDeadline = (endsAt: string | null): string | null => {
    if (!endsAt) return null;
    const date = new Date(endsAt);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const deadline = formatDeadline(challenge?.ends_at);

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
              New Photo Challenge:
              {' '}
              {challenge?.title}
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Hi
              {' '}
              {fullName}
              ,
            </Text>
            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              We&apos;ve just launched a new photo challenge! Submit your best shots and
              get featured in our community gallery.
            </Text>

            {/* Cover Image */}
            {challenge?.cover_image_url && (
              <Section
                className="my-[20px]"
              >
                <Img
                  src={challenge.cover_image_url}
                  alt={challenge.title}
                  width="100%"
                  className="rounded-lg"
                />
              </Section>
            )}

            {/* Challenge Details */}
            <Section
              className="my-[20px] rounded-lg bg-[#f9fafb] p-4"
            >
              <Text
                className="m-0 text-[14px] font-semibold text-[#171717]"
              >
                The Challenge:
              </Text>
              <Text
                className="mt-2 text-[14px] leading-[24px] text-[#4b5563]"
              >
                {challenge?.prompt}
              </Text>

              {deadline && (
                <Text
                  className="mt-4 text-[13px] text-[#6b7280]"
                >
                  <strong>
                    Deadline:
                  </strong>
                  {' '}
                  {deadline}
                </Text>
              )}

              {!deadline && (
                <Text
                  className="mt-4 text-[13px] text-[#059669]"
                >
                  <strong>
                    No deadline
                  </strong>
                  {' '}
                  - Take your time!
                </Text>
              )}
            </Section>

            <Section
              className="my-[20px]"
            >
              <Button
                className="rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
                href={challengeLink}
              >
                View Challenge & Submit
              </Button>
            </Section>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              or copy and paste this URL into your browser:
              {' '}
              <Link
                href={challengeLink}
                className="text-blue-600 no-underline"
              >
                {challengeLink}
              </Link>
            </Text>

            <Hr
              className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]"
            />

            <Text
              className="text-[13px] leading-[24px] text-[#6b7280]"
            >
              <strong>
                How it works:
              </strong>
            </Text>
            <Text
              className="text-[13px] leading-[24px] text-[#6b7280]"
            >
              1. Upload your photos or select from your library
              <br />
              2. Your submission goes to our review queue
              <br />
              3. Once accepted, your photo appears in the challenge gallery
            </Text>

            <Footer
              fullName={fullName}
              optOutLink={optOutLink}
              emailType="photo_challenges"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ChallengeAnnouncementEmail;
