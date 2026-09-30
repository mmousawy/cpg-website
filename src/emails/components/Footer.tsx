import {
  Img,
  Link,
  Section,
  Text,
} from '@react-email/components';

import { socialLinks } from '@/config/socials';
import { getEmailAssetsUrl, getEmailSiteUrl } from '@/emails/utils/siteUrl';

import EmailDivider from './EmailDivider';
import EmailText from './EmailText';
import {
  emailMutedLinkStyle,
  emailSocialButtonStyle,
  emailSocialSectionStyle,
  emailTextStyle,
} from './styles';

const emailSocialIcons: Record<string, string> = {
  Discord: 'discord.png',
  Instagram: 'instagram.png',
  WhatsApp: 'whatsapp.png',
};

const emailSocials = socialLinks.flatMap((social) => {
  const iconFile = emailSocialIcons[social.name];
  if (!iconFile) {
    return [];
  }

  return [{
    name: social.name,
    url: social.url,
    iconFile,
  }];
});

export default function Footer({
  fullName,
  recipientEmail,
  optOutLink,
  emailType,
}: {
  fullName?: string;
  recipientEmail?: string;
  optOutLink?: string;
  emailType?: 'events' | 'notifications' | 'newsletter' | 'photo_challenges';
}) {
  const contactUrl = `${getEmailSiteUrl()}/contact`;

  const getUnsubscribeText = () => {
    switch (emailType) {
      case 'events':
        return 'Unsubscribe from event updates';
      case 'notifications':
        return 'Unsubscribe from notifications';
      case 'newsletter':
        return 'Unsubscribe from newsletter';
      case 'photo_challenges':
        return 'Unsubscribe from challenge announcements';
      default:
        return 'Unsubscribe';
    }
  };

  return (
    <>
      <EmailDivider />
      <EmailText
        variant="muted"
      >
        {fullName || recipientEmail ? (
          <>
            This email is for
            {' '}
            {fullName && (
              <span
                style={{ color: emailTextStyle.color }}
              >
                {fullName}
              </span>
            )}
            {recipientEmail && (
              <>
                {fullName ? ' ' : null}
                <span
                  style={{ color: emailTextStyle.color }}
                >
                  (
                  {recipientEmail}
                  )
                </span>
              </>
            )}
            .
          </>
        ) : (
          <>This message was sent by Creative Photography Group.</>
        )}
        {' '}
        If that isn&apos;t you, please reply and let us know.
      </EmailText>
      <EmailText
        variant="mutedSpaced"
      >
        Questions or feedback?
        {' '}
        Reply to this email or
        {' '}
        <Link
          href={contactUrl}
          style={emailMutedLinkStyle}
        >
          contact us here
        </Link>
        .
      </EmailText>
      {optOutLink && (
        <Text
          style={{ margin: '8px 0 0 0', fontSize: '12px', lineHeight: '24px', color: emailMutedLinkStyle.color }}
        >
          <Link
            href={optOutLink}
            style={emailMutedLinkStyle}
          >
            {getUnsubscribeText()}
          </Link>
        </Text>
      )}
    </>
  );
}

export function EmailSocialLinks() {
  const assetsUrl = getEmailAssetsUrl();

  return (
    <Section
      style={emailSocialSectionStyle}
    >
      {emailSocials.map((social) => (
        <Link
          key={social.name}
          href={social.url}
          style={emailSocialButtonStyle}
        >
          <Img
            src={`${assetsUrl}/email/${social.iconFile}`}
            width="20"
            height="20"
            alt={social.name}
            style={{ display: 'block' }}
          />
        </Link>
      ))}
    </Section>
  );
}
