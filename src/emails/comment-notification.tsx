import { Column, Img, Link, Row, Section, Text } from '@react-email/components';

import { getEmailSiteUrl, toAbsoluteEmailUrl } from '@/emails/utils/siteUrl';
import {
  getCommentNotificationHeading,
  getCommentNotificationPreview,
  truncateCommentText,
} from '@/lib/notifications/commentEmailCopy';
import type { QueuedCommentEmailItem } from '@/lib/notifications/emailQueue';

import EmailButton from './components/EmailButton';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import {
  emailAccentLinkStyle,
  emailCalloutStyle,
  emailCalloutTitleStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from './components/styles';

export { getCommentNotificationSubject } from '@/lib/notifications/commentEmailCopy';

const avatarPlaceholderStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  backgroundColor: '#5e9b84',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontSize: '16px',
  fontWeight: 'bold',
} as const;

function CommentItemBlock({ item }: { item: QueuedCommentEmailItem }) {
  const fullEntityLink = toAbsoluteEmailUrl(item.entityLink);
  const fullCommenterProfileLink = item.commenterProfileLink
    ? toAbsoluteEmailUrl(item.commenterProfileLink)
    : null;
  const displayComment = truncateCommentText(item.commentText);

  return (
    <Section
      style={emailCalloutStyle}
    >
      <Row>
        <Column
          width="40"
          style={{ verticalAlign: 'top' }}
        >
          {fullCommenterProfileLink ? (
            <Link
              href={fullCommenterProfileLink}
            >
              {item.commenterAvatarUrl ? (
                <Img
                  src={item.commenterAvatarUrl}
                  width="40"
                  height="40"
                  alt={item.commenterName}
                  style={{ borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={avatarPlaceholderStyle}
                >
                  {item.commenterName.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          ) : (
            item.commenterAvatarUrl ? (
              <Img
                src={item.commenterAvatarUrl}
                width="40"
                height="40"
                alt={item.commenterName}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={avatarPlaceholderStyle}
              >
                {item.commenterName.charAt(0).toUpperCase()}
              </div>
            )
          )}
        </Column>
        <Column
          style={{ verticalAlign: 'top', paddingLeft: '12px' }}
        >
          {fullCommenterProfileLink ? (
            <Link
              href={fullCommenterProfileLink}
              style={{ textDecoration: 'none', color: emailTextStyle.color }}
            >
              <Text
                style={{ ...emailCalloutTitleStyle, marginBottom: '4px' }}
              >
                {item.commenterName}
                {item.isReply ? ' (reply)' : ''}
              </Text>
            </Link>
          ) : (
            <Text
              style={{ ...emailCalloutTitleStyle, marginBottom: '4px' }}
            >
              {item.commenterName}
              {item.isReply ? ' (reply)' : ''}
            </Text>
          )}
          {item.commenterNickname && (
            <Text
              style={{ ...emailMutedTextStyle, marginBottom: '8px', lineHeight: '16px' }}
            >
              @
              {item.commenterNickname}
            </Text>
          )}
          <Text
            style={{ ...emailTextStyle, lineHeight: '20px', whiteSpace: 'pre-wrap' }}
          >
            {displayComment}
          </Text>
          <Link
            href={fullEntityLink}
            style={{ ...emailAccentLinkStyle, fontSize: '12px' }}
          >
            View
          </Link>
        </Column>
      </Row>
    </Section>
  );
}

export const CommentNotificationEmail = ({
  preview,
  ownerName,
  recipientEmail,
  items,
  optOutLink,
  commenterName,
  commenterNickname,
  commenterAvatarUrl,
  commenterProfileLink,
  commentText,
  entityType,
  entityTitle,
  entityThumbnail,
  entityLink,
  isReply,
}: {
  preview?: boolean;
  ownerName: string;
  recipientEmail?: string;
  items?: QueuedCommentEmailItem[];
  optOutLink?: string;
  commenterName?: string;
  commenterNickname?: string | null;
  commenterAvatarUrl?: string | null;
  commenterProfileLink?: string | null;
  commentText?: string;
  entityType?: QueuedCommentEmailItem['entityType'];
  entityTitle?: string;
  entityThumbnail?: string | null;
  entityLink?: string;
  isReply?: boolean;
}) => {
  if (preview && (!items || items.length === 0)) {
    const baseUrl = getEmailSiteUrl();
    ownerName = 'Jane Doe';
    recipientEmail = 'jane.doe@example.com';
    items = [
      {
        commentId: 'preview-1',
        commenterName: 'John Smith',
        commenterNickname: 'johnsmith',
        commenterAvatarUrl: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-avatar.jpg',
        commenterProfileLink: `${baseUrl}/@johnsmith`,
        commentText: 'This is a sample comment on your album. Great work!',
        entityType: 'album',
        entityTitle: 'My Photography Album',
        entityThumbnail: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg',
        entityLink: `${baseUrl}/@johndoe/my-album`,
        isReply: false,
      },
    ];
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  } else if (!items || items.length === 0) {
    items = [
      {
        commentId: 'legacy',
        commenterName: commenterName || 'Someone',
        commenterNickname: commenterNickname ?? null,
        commenterAvatarUrl: commenterAvatarUrl ?? null,
        commenterProfileLink: commenterProfileLink ?? null,
        commentText: commentText || '',
        entityType: entityType || 'photo',
        entityTitle: entityTitle || '',
        entityThumbnail: entityThumbnail ?? null,
        entityLink: entityLink || '/',
        isReply: isReply ?? false,
      },
    ];
  }

  const firstItem = items[0];
  const fullEntityLink = toAbsoluteEmailUrl(firstItem.entityLink);
  const previewText = getCommentNotificationPreview(items);
  const heading = getCommentNotificationHeading(items);
  const introText = items.length === 1
    ? firstItem.isReply
      ? `Someone replied to your comment on ${firstItem.entityTitle}:`
      : `Someone commented on your ${firstItem.entityType}:`
    : `Here are the latest comments on ${firstItem.entityTitle}:`;

  return (
    <EmailLayout
      previewText={previewText}
      fullName={ownerName}
      recipientEmail={recipientEmail}
      optOutLink={optOutLink}
      emailType="notifications"
    >
      <EmailHeading>
        {heading}
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {ownerName}
        ,
      </EmailText>
      <br />
      <EmailText>
        {introText}
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        <Link
          href={fullEntityLink}
        >
          <Row>
            {firstItem.entityThumbnail && (
              <Column
                width="64"
              >
                <Img
                  src={firstItem.entityThumbnail}
                  width="64"
                  height="64"
                  alt={firstItem.entityTitle}
                  style={{ borderRadius: '6px', objectFit: 'cover' }}
                />
              </Column>
            )}
            <Column
              style={{ verticalAlign: 'top', paddingLeft: firstItem.entityThumbnail ? '16px' : 0 }}
            >
              <Text
                style={{ ...emailCalloutTitleStyle, fontSize: '15px', lineHeight: '24px', margin: 0 }}
              >
                {firstItem.entityTitle}
              </Text>
            </Column>
          </Row>
        </Link>
      </Section>

      {items.map((item) => (
        <CommentItemBlock
          key={item.commentId}
          item={item}
        />
      ))}

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={fullEntityLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          {items.length === 1 ? 'View comment' : 'View all comments'}
        </EmailButton>
      </Section>
    </EmailLayout>
  );
};

export default CommentNotificationEmail;
