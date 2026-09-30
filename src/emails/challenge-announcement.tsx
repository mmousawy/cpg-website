import { Img, Link, Section, Text } from '@react-email/components';

import EmailButton from './components/EmailButton';
import EmailDivider from './components/EmailDivider';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import RichContent from './components/RichContent';
import {
  emailAccentLinkStyle,
  emailCalloutPlainStyle,
  emailSectionHeadingStyle,
  emailSmallMutedTextStyle,
} from './components/styles';

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
  recipientEmail,
  challenge,
  challengeLink,
  optOutLink,
}: {
  preview?: boolean;
  fullName: string;
  recipientEmail?: string;
  challenge: ChallengeData;
  challengeLink: string;
  optOutLink?: string;
}) => {
  if (preview) {
    fullName = 'John Doe';
    recipientEmail = 'john.doe@example.com';
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
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
      optOutLink={optOutLink}
      emailType="photo_challenges"
    >
      <EmailHeading>
        New Photo Challenge:
        {' '}
        {challenge?.title}
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {fullName}
        ,
      </EmailText>
      <br />
      <EmailText>
        We&apos;ve just launched a new photo challenge! Submit your best shots and
        get featured in our community gallery.
      </EmailText>

      {challenge?.cover_image_url && (
        <Section
          style={{ margin: '20px 0' }}
        >
          <Img
            src={challenge.cover_image_url}
            alt={challenge.title}
            width="100%"
            style={{ borderRadius: '8px' }}
          />
        </Section>
      )}

      <Section
        style={{ ...emailCalloutPlainStyle, backgroundColor: '#f9fafb' }}
      >
        <Text
          style={{ ...emailSectionHeadingStyle, margin: '0 0 8px 0' }}
        >
          The Challenge:
        </Text>
        {challenge?.prompt && (
          <RichContent
            html={challenge.prompt}
          />
        )}

        {deadline && (
          <Text
            style={{ ...emailSmallMutedTextStyle, marginTop: '16px' }}
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
            style={{ ...emailSmallMutedTextStyle, marginTop: '16px', color: '#059669' }}
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
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={challengeLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          View challenge
        </EmailButton>
      </Section>

      <EmailText>
        or copy and paste this URL into your browser:
        {' '}
        <Link
          href={challengeLink}
          style={emailAccentLinkStyle}
        >
          {challengeLink}
        </Link>
      </EmailText>

      <EmailDivider />

      <EmailText
        style={emailSmallMutedTextStyle}
      >
        <strong>
          How it works:
        </strong>
      </EmailText>
      <EmailText
        style={emailSmallMutedTextStyle}
      >
        1. Upload your photos or select from your library
        <br />
        2. Your submission goes to our review queue
        <br />
        3. Once accepted, your photo appears in the challenge gallery
      </EmailText>
    </EmailLayout>
  );
};

export default ChallengeAnnouncementEmail;
