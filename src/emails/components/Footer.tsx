import {
  Hr,
  Link,
  Text,
} from '@react-email/components';

import { getEmailReplyToAddress, getEmailSiteUrl } from '@/emails/utils/siteUrl';

export default function Footer({
  fullName,
  optOutLink,
  emailType,
}: {
  fullName?: string;
  optOutLink?: string;
  emailType?: 'events' | 'notifications' | 'newsletter' | 'photo_challenges' | 'admin_notifications';
}) {
  const replyToAddress = getEmailReplyToAddress();
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
      case 'admin_notifications':
        return 'Unsubscribe from admin notifications';
      default:
        return 'Unsubscribe';
    }
  };

  return (
    <>
      <Hr
        className="mx-0 my-5 w-full border border-solid border-[#e5e7ea]"
      />
      <Text
        className="mb-0! text-[12px] leading-6 text-[#666666]"
      >
        {fullName ? (
          <>
            This message was intended for
            {' '}
            <span
              className="text-[#171717]"
            >
              {fullName}
            </span>
            .
          </>
        ) : (
          <>This message was sent by Creative Photography Group.</>
        )}
        {' '}
        If you were not expecting this email, you can ignore it.
      </Text>
      <Text
        className="mt-2! mb-0! text-[12px] leading-6 text-[#666666]"
      >
        Questions or feedback?
        {' '}
        {replyToAddress ? (
          <>
            Reply to this email or contact us at
            {' '}
            <Link
              href={`mailto:${replyToAddress}`}
              className="text-[#666666] underline"
            >
              {replyToAddress}
            </Link>
            .
          </>
        ) : (
          <>
            Reply to this email or
            {' '}
            <Link
              href={contactUrl}
              className="text-[#666666] underline"
            >
              contact us on the website
            </Link>
            .
          </>
        )}
      </Text>
      {optOutLink && (
        <Text
          className="mt-2! mb-0! text-[12px] leading-6 text-[#666666]"
        >
          <Link
            href={optOutLink}
            className="text-[#666666] underline"
          >
            {getUnsubscribeText()}
          </Link>
        </Text>
      )}
    </>
  );
}
