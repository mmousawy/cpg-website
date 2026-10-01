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
  if (preview) {
    adminName = 'Admin User';
    recipientEmail = 'admin@example.com';
    reporterName = 'John Smith';
    reporterNickname = 'johnsmith';
    reporterEmail = 'john@example.com';
    reporterAvatarUrl = 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-avatar.jpg';
    reporterProfileLink = `${baseUrl}/@johnsmith`;
    entityType = 'photo';
    entityTitle = 'Sunset Over Mountains';
    entityThumbnail = 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg';
    entityLink = `${baseUrl}/@johnsmith/photo/abc123`;
    reason = 'Inappropriate or explicit content';
    details = 'This photo contains inappropriate content that violates community guidelines.';
    reviewLink = `${baseUrl}/admin/reports`;
    isAnonymous = false;
  }

  const previewText = `${reporterName} reported ${entityTitle}`;

  const entityTypeLabel = {
    photo: 'Photo',
    album: 'Album',
    profile: 'Profile',
    comment: 'Comment',
  }[entityType];

  const renderEntityRow = (wrapLink: boolean) => {
    const row = (
      <Row>
        {entityThumbnail && (
          <Column
            width="64"
          >
            <Img
              src={entityThumbnail}
              width="64"
              height="64"
              alt={entityTitle}
              style={{ borderRadius: '6px', objectFit: 'cover' }}
            />
          </Column>
        )}
        <Column
          style={{ verticalAlign: 'top', paddingLeft: entityThumbnail ? '16px' : 0 }}
        >
          <Text
            style={{ ...emailMutedTextStyle, margin: 0, lineHeight: '16px' }}
          >
            {entityTypeLabel}
          </Text>
          <Text
            style={{ ...emailCalloutTitleStyle, fontSize: '15px', lineHeight: '24px', margin: 0 }}
          >
            {entityTitle}
          </Text>
        </Column>
      </Row>
    );
    if (wrapLink && entityLink) {
      return (
        <Link
          href={entityLink}
        >
          {row}
        </Link>
      );
    }
    return row;
  };

  const renderReporterAvatar = () => {
    if (reporterProfileLink) {
      return (
        <Link
          href={reporterProfileLink}
        >
          {reporterAvatarUrl ? (
            <Img
              src={reporterAvatarUrl}
              width="40"
              height="40"
              alt={reporterName}
              style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={avatarPlaceholderStyle}
            >
              {reporterName.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      );
    }
    if (reporterAvatarUrl) {
      return (
        <Img
          src={reporterAvatarUrl}
          width="40"
          height="40"
          alt={reporterName}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
        />
      );
    }
    return (
      <div
        style={avatarPlaceholderStyle}
      >
        {reporterName.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <EmailLayout
      previewText={previewText}
      fullName={adminName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        New content report
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {adminName}
        ,
      </EmailText>
      <br />
      <EmailText>
        A new report has been submitted and is waiting for review.
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        {renderEntityRow(!!entityLink)}
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
            {reporterProfileLink ? (
              <Link
                href={reporterProfileLink}
                style={{ textDecoration: 'none', color: emailTextStyle.color }}
              >
                <Text
                  style={{ ...emailCalloutTitleStyle, marginBottom: '4px' }}
                >
                  {reporterName}
                </Text>
              </Link>
            ) : (
              <Text
                style={{ ...emailCalloutTitleStyle, marginBottom: '4px' }}
              >
                {reporterName}
              </Text>
            )}
            {isAnonymous && (
              <Text
                style={{ ...emailMutedTextStyle, marginBottom: '4px', lineHeight: '16px' }}
              >
                Anonymous reporter
              </Text>
            )}
            {reporterNickname && !isAnonymous && (
              reporterProfileLink ? (
                <Link
                  href={reporterProfileLink}
                  style={{ textDecoration: 'none' }}
                >
                  <Text
                    style={{ ...emailMutedTextStyle, marginBottom: '8px', lineHeight: '16px' }}
                  >
                    @
                    {reporterNickname}
                  </Text>
                </Link>
              ) : (
                <Text
                  style={{ ...emailMutedTextStyle, marginBottom: '8px', lineHeight: '16px' }}
                >
                  @
                  {reporterNickname}
                </Text>
              )
            )}
            {reporterEmail && isAnonymous && (
              <Text
                style={{ ...emailMutedTextStyle, marginBottom: '8px', lineHeight: '16px' }}
              >
                {reporterEmail}
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
          {reason}
        </Text>
        {details && (
          <>
            <Text
              style={{ ...emailCalloutLabelStyle, marginTop: '16px', marginBottom: '8px' }}
            >
              Additional Details
            </Text>
            <Text
              style={{ ...emailTextStyle, lineHeight: '20px' }}
            >
              {details}
            </Text>
          </>
        )}
      </Section>

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={reviewLink}
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
