import { Link, Section } from '@react-email/components';

import EmailButton from '../components/EmailButton';
import EmailHeading from '../components/EmailHeading';
import EmailLayout from '../components/EmailLayout';
import EmailText from '../components/EmailText';
import { emailInlineLinkStyle, emailListItemStyle, emailListStyle } from '../components/styles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export const WelcomeTemplate = ({
  preview,
  fullName,
  recipientEmail,
}: {
  preview?: boolean;
  fullName: string;
  recipientEmail?: string;
}) => {
  if (preview) {
    fullName = 'John Doe';
    recipientEmail = 'john.doe@example.com';
  }

  const previewText = 'Welcome to Creative Photography Group!';

  return (
    <EmailLayout
      previewText={previewText}
      fullName={fullName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        Welcome to Creative Photography Group! 📸
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {fullName}
        ,
      </EmailText>
      <br />
      <EmailText>
        Your email has been verified and your account is now active. Welcome to our community of photography enthusiasts!
      </EmailText>

      <EmailText>
        Here&apos;s what you can do next:
      </EmailText>

      <br />

      <ul
        style={emailListStyle}
      >
        <li
          style={emailListItemStyle}
        >
          Browse upcoming{' '}
          <Link
            href={`${baseUrl}/events`}
            style={emailInlineLinkStyle}
          >
            events and meetups
          </Link>
        </li>
        <li
          style={emailListItemStyle}
        >
          Explore{' '}
          <Link
            href={`${baseUrl}/galleries`}
            style={emailInlineLinkStyle}
          >
            photo galleries
          </Link>
          {' '}
          from the community
        </li>
        <li
          style={emailListItemStyle}
        >
          Set up your{' '}
          <Link
            href={`${baseUrl}/account`}
            style={emailInlineLinkStyle}
          >
            profile
          </Link>
          {' '}
          and create your first album
        </li>
        <li
          style={emailListItemStyle}
        >
          Join our{' '}
          <Link
            href="https://discord.gg/cWQK8udb6p"
            style={emailInlineLinkStyle}
          >
            Discord server
          </Link>
          {' '}
          to connect with other photographers
        </li>
      </ul>

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={`${baseUrl}/events`}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          Browse upcoming events
        </EmailButton>
      </Section>

      <EmailText>
        We&apos;re excited to have you join us!
      </EmailText>
    </EmailLayout>
  );
};

export default WelcomeTemplate;
