import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

import type { QueuedCommentEmailItem } from '@/lib/notifications/emailQueue';
import {
  getCommentNotificationHeading,
  getCommentNotificationPreview,
  truncateCommentText,
} from '@/lib/notifications/commentEmailCopy';
import { getEmailSiteUrl, toAbsoluteEmailUrl } from '@/emails/utils/siteUrl';
import Footer from './components/Footer';
import EmailHeader from './components/Header';

export { getCommentNotificationSubject } from '@/lib/notifications/commentEmailCopy';

function CommentItemBlock({ item }: { item: QueuedCommentEmailItem }) {
  const fullEntityLink = toAbsoluteEmailUrl(item.entityLink);
  const fullCommenterProfileLink = item.commenterProfileLink
    ? toAbsoluteEmailUrl(item.commenterProfileLink)
    : null;
  const displayComment = truncateCommentText(item.commentText);

  return (
    <Section
      className="my-[20px] rounded-lg border border-[#e5e7ea] bg-[#f7f7f7] p-4"
    >
      <Row>
        <Column
          width="40"
          className="align-top"
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
                  className="rounded-full object-cover"
                />
              ) : (
                <div
                  style={{
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
                  }}
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
                className="rounded-full object-cover"
              />
            ) : (
              <div
                style={{
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
                }}
              >
                {item.commenterName.charAt(0).toUpperCase()}
              </div>
            )
          )}
        </Column>
        <Column
          className="pl-3 align-top"
        >
          {fullCommenterProfileLink ? (
            <Link
              href={fullCommenterProfileLink}
              className="text-[#171717] no-underline"
            >
              <Text
                className="my-0! mb-1! text-[14px] font-semibold leading-[20px] text-[#171717]"
              >
                {item.commenterName}
                {item.isReply ? ' (reply)' : ''}
              </Text>
            </Link>
          ) : (
            <Text
              className="my-0! mb-1! text-[14px] font-semibold leading-[20px] text-[#171717]"
            >
              {item.commenterName}
              {item.isReply ? ' (reply)' : ''}
            </Text>
          )}
          {item.commenterNickname && (
            <Text
              className="my-0! mb-2! text-[12px] leading-[16px] text-[#666666]"
            >
              @
              {item.commenterNickname}
            </Text>
          )}
          <Text
            className="my-0! text-[14px] leading-[20px] text-[#171717] whitespace-pre-wrap"
          >
            {displayComment}
          </Text>
          <Link
            href={fullEntityLink}
            className="text-[12px] text-[#38785f] underline"
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
  items,
  optOutLink,
  // Legacy single-item props for email preview page
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
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
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
              {heading}
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Hi
              {' '}
              {ownerName}
              ,
            </Text>
            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              {introText}
            </Text>

            <Section
              className="my-[20px]"
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
                        className="rounded-md object-cover"
                      />
                    </Column>
                  )}
                  <Column
                    className={firstItem.entityThumbnail ? 'pl-4 align-top' : 'align-top'}
                  >
                    <Text
                      className="mt-0! text-[15px] font-semibold leading-[24px] text-[#171717]"
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

            <div
              className="my-[20px]"
            >
              <Link
                href={fullEntityLink}
                className="inline-block rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
              >
                {items.length === 1 ? 'View comment' : 'View all comments'}
              </Link>
            </div>

            <Footer
              fullName={ownerName}
              optOutLink={optOutLink}
              emailType="notifications"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default CommentNotificationEmail;
