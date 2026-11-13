import { Section, Text } from '@react-email/components';

import EmailButton from '@/emails/components/EmailButton';
import EmailHeading from '@/emails/components/EmailHeading';
import EmailLayout from '@/emails/components/EmailLayout';
import EmailText from '@/emails/components/EmailText';
import { emailMutedTextStyle } from '@/emails/components/styles';
import { toAbsoluteEmailUrl } from '@/emails/utils/siteUrl';
import {
  getMentionNotificationHeading,
  getMentionNotificationSubject,
} from '@/lib/notifications/mentionEmailCopy';
import type { MentionEmailItem } from '@/lib/notifications/emailQueue';

type MentionNotificationEmailProps = {
  recipientName: string;
  recipientEmail: string;
  items: MentionEmailItem[];
  optOutLink?: string;
};

export function MentionNotificationEmail({
  recipientName,
  recipientEmail,
  items,
  optOutLink,
}: MentionNotificationEmailProps) {
  const heading = getMentionNotificationHeading(items);

  return (
    <EmailLayout
      previewText={getMentionNotificationSubject(items)}
      fullName={recipientName}
      recipientEmail={recipientEmail}
      optOutLink={optOutLink}
      emailType="notifications"
    >
      <EmailHeading>{heading}</EmailHeading>
      {items.map((item, index) => {
        const href = toAbsoluteEmailUrl(item.entityLink);
        const sentence = item.kind === 'photo_tag'
          ? `${item.actorName || 'Someone'} tagged you in a photo.`
          : `${item.actorName || 'Someone'} mentioned you in ${item.contextLabel}.`;
        return (
          <Section
            key={`${item.entityLink}-${index}`}
          >
            <EmailText>{sentence}</EmailText>
            {item.entityTitle ? (
              <Text
                style={emailMutedTextStyle}
              >{item.entityTitle}</Text>
            ) : null}
            <EmailButton
              href={href}
            >View</EmailButton>
          </Section>
        );
      })}
    </EmailLayout>
  );
}

export { getMentionNotificationSubject };
