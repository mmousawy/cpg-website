import { Column, Img, Link, Row, Section, Text } from '@react-email/components';

import EmailButton from './components/EmailButton';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import {
  emailCalloutLabelStyle,
  emailCalloutStyle,
  emailCalloutTitleStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from './components/styles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

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

export const ReportNotificationEmail = ({
  preview,
  adminName,
  recipientEmail,
  reporterName,
  reporterNickname,
  reporterEmail,
  reporterAvatarUrl,
  reporterProfileLink,
  entityType,
  entityTitle,
  entityThumbnail,
  entityLink,
  reason,
  details,
  reviewLink,
  isAnonymous,
}: {
  preview?: boolean;
  adminName: string;
  recipientEmail?: string;
  reporterName: string;
  reporterNickname: string | null;
  reporterEmail: string | null;
  reporterAvatarUrl: string | null;
  reporterProfileLink: string | null;
  entityType: 'photo' | 'album' | 'profile' | 'comment';
  entityTitle: string;
  entityThumbnail: string | null;
  entityLink: string | null;
  reason: string;
  details: string | null;
  reviewLink: string;
  isAnonymous: boolean;
}) => {
  const data = preview
    ? {
      adminName: 'Admin User',
      recipientEmail: 'admin@example.com',
      reporterName: 'John Smith',
      reporterNickname: 'johnsmith' as string | null,
      reporterEmail: 'john@example.com' as string | null,
      reporterAvatarUrl:
          'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-avatar.jpg',
      reporterProfileLink: `${baseUrl}/@johnsmith`,
      entityType: 'photo' as const,
      entityTitle: 'Sunset Over Mountains',
      entityThumbnail:
          'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg',
      entityLink: `${baseUrl}/@johnsmith/photo/abc123`,
      reason: 'Inappropriate or explicit content',
      details: 'This photo contains inappropriate content that violates community guidelines.',
      reviewLink: `${baseUrl}/admin/reports`,
      isAnonymous: false,
    }
    : {
      adminName,
      recipientEmail,
      reporterName,
      reporterNickname,
      reporterEmail,
      reporterAvatarUrl,
      reporterProfileLink,
      entityType,
      entityTitle,
      entityThumbnail,
      entityLink,
      reason,
      details,
      reviewLink,
      isAnonymous,
    };

  const previewText = `${data.reporterName} reported ${data.entityTitle}`;

  const entityTypeLabel = {
    photo: 'Photo',
    album: 'Album',
    profile: 'Profile',
    comment: 'Comment',
  }[data.entityType];

  const renderEntityRow = (wrapLink: boolean) => {
    const row = (
      <Row>
        {data.entityThumbnail && (
          <Column
            width="64"
          >
            <Img
              src={data.entityThumbnail}
              width="64"
              height="64"
              alt={data.entityTitle}
              style={{ borderRadius: '6px', objectFit: 'cover' }}
            />
          </Column>
        )}
        <Column
          style={{ verticalAlign: 'top', paddingLeft: data.entityThumbnail ? '16px' : 0 }}
        >
          <Text
            style={{ ...emailMutedTextStyle, margin: 0, lineHeight: '16px' }}
          >
            {entityTypeLabel}
          </Text>
          <Text
            style={{ ...emailCalloutTitleStyle, fontSize: '15px', lineHeight: '24px', margin: 0 }}
          >
            {data.entityTitle}
          </Text>
        </Column>
      </Row>
    );
    if (wrapLink && data.entityLink) {
      return (
        <Link
          href={data.entityLink}
        >
          {row}
        </Link>
      );
    }
    return row;
  };

  const renderReporterAvatar = () => {
    if (data.reporterProfileLink) {
      return (
        <Link
          href={data.reporterProfileLink}
        >
          {data.reporterAvatarUrl ? (
            <Img
              src={data.reporterAvatarUrl}
              width="40"
              height="40"
              alt={data.reporterName}
              style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={avatarPlaceholderStyle}
            >
              {data.reporterName.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      );
    }
    if (data.reporterAvatarUrl) {
      return (
        <Img
          src={data.reporterAvatarUrl}
          width="40"
          height="40"
          alt={data.reporterName}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
        />
      );
    }
    return (
      <div
        style={avatarPlaceholderStyle}
      >
        {data.reporterName.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <EmailLayout
      previewText={previewText}
      fullName={data.adminName}
      recipientEmail={data.recipientEmail}
    >
      <EmailHeading>
        New content report
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {data.adminName}
        ,
      </EmailText>
      <br />
      <EmailText>
        A new report has been submitted and is waiting for review.
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        {renderEntityRow(!!data.entityLink)}
      </Section>

      <Section
        style={emailCalloutStyle}
      >
        <Row>
          <Column
            width="40"
            style={{ verticalAlign: 'top' }}
          >
            {renderReporterAvatar()}
          </Column>
          <Column
            style={{ verticalAlign: 'top', paddingLeft: '12px' }}
          >
            {data.reporterProfileLink ? (
              <Link
                href={data.reporterProfileLink}
                style={{ textDecoration: 'none', color: emailTextStyle.color }}
              >
                <Text
                  style={{ ...emailCalloutTitleStyle, marginBottom: '4px' }}
                >
                  {data.reporterName}
                </Text>
              </Link>
            ) : (
              <Text
                style={{ ...emailCalloutTitleStyle, marginBottom: '4px' }}
              >
                {data.reporterName}
              </Text>
            )}
            {data.isAnonymous && (
              <Text
                style={{ ...emailMutedTextStyle, marginBottom: '4px', lineHeight: '16px' }}
              >
                Anonymous reporter
              </Text>
            )}
            {data.reporterNickname && !data.isAnonymous && (
              data.reporterProfileLink ? (
                <Link
                  href={data.reporterProfileLink}
                  style={{ textDecoration: 'none' }}
                >
                  <Text
                    style={{ ...emailMutedTextStyle, marginBottom: '8px', lineHeight: '16px' }}
                  >
                    @
                    {data.reporterNickname}
                  </Text>
                </Link>
              ) : (
                <Text
                  style={{ ...emailMutedTextStyle, marginBottom: '8px', lineHeight: '16px' }}
                >
                  @
                  {data.reporterNickname}
                </Text>
              )
            )}
            {data.reporterEmail && data.isAnonymous && (
              <Text
                style={{ ...emailMutedTextStyle, marginBottom: '8px', lineHeight: '16px' }}
              >
                {data.reporterEmail}
              </Text>
            )}
          </Column>
        </Row>
      </Section>

      <Section
        style={{
          ...emailCalloutStyle,
          backgroundColor: '#fff5f5',
        }}
      >
        <Text
          style={{ ...emailCalloutLabelStyle, marginBottom: '8px' }}
        >
          Reason
        </Text>
        <Text
          style={{ ...emailTextStyle, lineHeight: '20px' }}
        >
          {data.reason}
        </Text>
        {data.details && (
          <>
            <Text
              style={{ ...emailCalloutLabelStyle, marginTop: '16px', marginBottom: '8px' }}
            >
              Additional Details
            </Text>
            <Text
              style={{ ...emailTextStyle, lineHeight: '20px' }}
            >
              {data.details}
            </Text>
          </>
        )}
      </Section>

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={data.reviewLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          Review report
        </EmailButton>
      </Section>
    </EmailLayout>
  );
};

export default ReportNotificationEmail;
