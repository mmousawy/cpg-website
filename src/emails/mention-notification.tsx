import { Column, Img, Link, Row, Section, Text } from '@react-email/components';

import EmailButton from '@/emails/components/EmailButton';
import EmailHeading from '@/emails/components/EmailHeading';
import EmailLayout from '@/emails/components/EmailLayout';
import EmailText from '@/emails/components/EmailText';
import {
  emailAccentLinkStyle,
  emailCalloutStyle,
  emailCalloutTitleStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from '@/emails/components/styles';
import { getEmailResizedImageUrl } from '@/emails/utils/emailImage';
import { getEmailSiteUrl, toAbsoluteEmailUrl } from '@/emails/utils/siteUrl';
import {
  getMentionNotificationHeading,
  getMentionNotificationIntro,
  getMentionNotificationSubject,
} from '@/lib/notifications/mentionEmailCopy';
import type { MentionEmailItem } from '@/lib/notifications/emailQueue';

const SAMPLE_AVATAR =
  'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-avatar.jpg';
const SAMPLE_PHOTO =
  'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg';

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

type MentionNotificationEmailProps = {
  preview?: boolean;
  recipientName?: string;
  recipientEmail?: string;
  items?: MentionEmailItem[];
  optOutLink?: string;
};

function actorInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function ActorAvatar({ item }: { item: MentionEmailItem }) {
  const name = item.actorName || 'Someone';
  const avatarUrl = getEmailResizedImageUrl(item.actorAvatarUrl, 80);
  const profileHref = item.actorProfileLink ? toAbsoluteEmailUrl(item.actorProfileLink) : null;
  const avatar = avatarUrl ? (
    <Img
      src={avatarUrl}
      width="40"
      height="40"
      alt={name}
      style={{ borderRadius: '50%', objectFit: 'cover' }}
    />
  ) : (
    <div
      style={avatarPlaceholderStyle}
    >
      {actorInitial(name)}
    </div>
  );

  if (!profileHref) return avatar;
  return (
    <Link
      href={profileHref}
    >
      {avatar}
    </Link>
  );
}

function ActorName({ item }: { item: MentionEmailItem }) {
  const name = item.actorName || 'Someone';
  const profileHref = item.actorProfileLink ? toAbsoluteEmailUrl(item.actorProfileLink) : null;
  const title = (
    <Text
      style={{ ...emailCalloutTitleStyle, marginBottom: '4px' }}
    >
      {name}
    </Text>
  );

  if (!profileHref) return title;
  return (
    <Link
      href={profileHref}
      style={{ textDecoration: 'none', color: emailTextStyle.color }}
    >
      {title}
    </Link>
  );
}

function MentionItemBlock({ item }: { item: MentionEmailItem }) {
  const href = toAbsoluteEmailUrl(item.entityLink);
  const isPhotoTag = item.kind === 'photo_tag';
  const thumbnail = getEmailResizedImageUrl(item.entityThumbnail, isPhotoTag ? 850 : 128);
  const sentence = isPhotoTag
    ? 'tagged you in a photo'
    : `mentioned you in ${item.contextLabel}`;

  return (
    <Section
      style={emailCalloutStyle}
    >
      <Row>
        <Column
          width="40"
          style={{ verticalAlign: 'top' }}
        >
          <ActorAvatar
            item={item}
          />
        </Column>
        <Column
          style={{ verticalAlign: 'top', paddingLeft: '12px' }}
        >
          <ActorName
            item={item}
          />
          {item.actorNickname ? (
            <Text
              style={{ ...emailMutedTextStyle, marginBottom: '8px', lineHeight: '16px' }}
            >
              @
              {item.actorNickname}
            </Text>
          ) : null}
          <Text
            style={{ ...emailTextStyle, lineHeight: '20px', marginBottom: thumbnail ? '12px' : 0 }}
          >
            {sentence}
          </Text>
        </Column>
      </Row>
      {isPhotoTag && thumbnail ? (
        <Link
          href={href}
        >
          <Img
            src={thumbnail}
            width="393"
            alt={item.entityTitle || 'Photo'}
            style={{
              width: '100%',
              maxWidth: '393px',
              height: 'auto',
              borderRadius: '8px',
              objectFit: 'cover',
              display: 'block',
              margin: '0 0 8px 0',
            }}
          />
          {item.entityTitle ? (
            <Text
              style={{ ...emailCalloutTitleStyle, fontSize: '15px', lineHeight: '24px', margin: '0 0 8px 0' }}
            >
              {item.entityTitle}
            </Text>
          ) : null}
        </Link>
      ) : (
        <Link
          href={href}
        >
          <Row>
            {thumbnail ? (
              <Column
                width="64"
              >
                <Img
                  src={thumbnail}
                  width="64"
                  height="64"
                  alt={item.entityTitle}
                  style={{ borderRadius: '6px', objectFit: 'cover', display: 'block' }}
                />
              </Column>
            ) : null}
            <Column
              style={{
                verticalAlign: 'top',
                paddingLeft: thumbnail ? '16px' : 0,
              }}
            >
              <Text
                style={{ ...emailMutedTextStyle, margin: 0, lineHeight: '16px' }}
              >
                {item.contextLabel}
              </Text>
              {item.entityTitle ? (
                <Text
                  style={{ ...emailCalloutTitleStyle, fontSize: '15px', lineHeight: '24px', margin: '4px 0 0 0' }}
                >
                  {item.entityTitle}
                </Text>
              ) : null}
            </Column>
          </Row>
        </Link>
      )}
      <Link
        href={href}
        style={{ ...emailAccentLinkStyle, fontSize: '12px' }}
      >
        {isPhotoTag ? 'View photo' : 'View'}
      </Link>
    </Section>
  );
}

function previewItems(): MentionEmailItem[] {
  const baseUrl = getEmailSiteUrl();
  return [
    {
      kind: 'photo_tag',
      actorName: 'Murtada',
      actorNickname: 'murtada',
      actorAvatarUrl: SAMPLE_AVATAR,
      actorProfileLink: `${baseUrl}/@murtada`,
      entityTitle: 'Finding photography inspiration in Het Depot',
      entityThumbnail: SAMPLE_PHOTO,
      entityLink: `${baseUrl}/@murtada/photo/5pzfq`,
      contextLabel: 'a photo',
    },
  ];
}

export function MentionNotificationEmail({
  preview,
  recipientName = '',
  recipientEmail,
  items = [],
  optOutLink,
}: MentionNotificationEmailProps) {
  if (preview) {
    recipientName = 'Jane Doe';
    recipientEmail = 'jane.doe@example.com';
    items = previewItems();
    optOutLink = `${getEmailSiteUrl()}/unsubscribe/preview-token`;
  }

  const heading = getMentionNotificationHeading(items);
  const intro = getMentionNotificationIntro(items);
  const ctaHref = toAbsoluteEmailUrl(items[0]?.entityLink || '/');
  const ctaLabel = items.every((item) => item.kind === 'photo_tag')
    ? items.length === 1 ? 'View photo' : 'View photos'
    : items.length === 1 ? 'View' : 'View all';

  return (
    <EmailLayout
      previewText={getMentionNotificationSubject(items)}
      fullName={recipientName}
      recipientEmail={recipientEmail}
      optOutLink={optOutLink}
      emailType="notifications"
    >
      <EmailHeading>{heading}</EmailHeading>

      <EmailText>
        Hi
        {' '}
        {recipientName}
        ,
      </EmailText>
      <br />
      <EmailText>
        {intro}
      </EmailText>

      {items.map((item, index) => (
        <MentionItemBlock
          key={`${item.entityLink}-${item.actorNickname ?? item.actorName}-${index}`}
          item={item}
        />
      ))}

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={ctaHref}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          {ctaLabel}
        </EmailButton>
      </Section>
    </EmailLayout>
  );
}

export { getMentionNotificationSubject };

export default MentionNotificationEmail;
