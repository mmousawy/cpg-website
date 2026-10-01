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

export const ReportResolvedEmail = ({
  reporterName,
  recipientEmail,
  reporterNickname,
  reporterAvatarUrl,
  entityType,
  entityTitle,
  entityThumbnail,
  entityLink,
  entityOwnerNickname,
  entityShortId,
  entityCreatedAt,
  entityPhotoCount,
  reason,
  resolutionType,
  message,
  isAnonymous,
}: {
  reporterName: string;
  recipientEmail?: string;
  reporterNickname: string | null;
  reporterAvatarUrl: string | null;
  entityType: 'photo' | 'album' | 'profile' | 'comment';
  entityTitle: string;
  entityThumbnail: string | null;
  entityLink: string | null;
  entityOwnerNickname?: string | null;
  entityShortId?: string | null;
  entityCreatedAt?: string | null;
  entityPhotoCount?: number | null;
  reason: string;
  resolutionType: string;
  message?: string | null;
  isAnonymous: boolean;
}) => {
  const previewText = `Your report about ${entityTitle} has been resolved`;

  const entityTypeLabel = {
    photo: 'Photo',
    album: 'Album',
    profile: 'Profile',
    comment: 'Comment',
  }[entityType];

  const getFormattedEntityTitle = () => {
    if (entityType === 'photo') {
      const baseTitle = entityTitle.includes(' (')
        ? entityTitle.split(' (')[0].trim()
        : entityTitle;
      const displayTitle = baseTitle === 'Untitled' ? `"${baseTitle}"` : baseTitle;
      const shortIdPart = entityShortId ? ` (${entityShortId})` : '';
      const ownerPart = entityOwnerNickname ? ` by @${entityOwnerNickname}` : '';
      return `${displayTitle}${shortIdPart}${ownerPart}`;
    } else if (entityType === 'album') {
      const displayTitle = entityTitle === 'Untitled Album' ? `"${entityTitle}"` : entityTitle;
      const ownerPart = entityOwnerNickname ? ` by @${entityOwnerNickname}` : '';
      return `${displayTitle}${ownerPart}`;
    }
    return entityTitle;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const entityMeta = (entityCreatedAt || (entityType === 'album' && entityPhotoCount !== null)) && (
    <Text
      style={{ ...emailMutedTextStyle, marginTop: '4px', lineHeight: '16px' }}
    >
      {entityCreatedAt && formatDate(entityCreatedAt)}
      {entityCreatedAt && entityType === 'album' && entityPhotoCount !== null && ' • '}
      {entityType === 'album' && entityPhotoCount !== null && (
        <>
          {entityPhotoCount}
          {' '}
          photo
          {entityPhotoCount !== 1 ? 's' : ''}
        </>
      )}
    </Text>
  );

  const entityContent = (
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
          {entityLink ? getFormattedEntityTitle() : entityTitle}
        </Text>
        {entityLink && entityMeta}
      </Column>
    </Row>
  );

  return (
    <EmailLayout
      previewText={previewText}
      fullName={reporterName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        Your report has been resolved
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {reporterName}
        ,
      </EmailText>
      <br />
      <EmailText>
        Thank you for helping keep our community safe. Your report has been reviewed and resolved.
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        {entityLink ? (
          <Link
            href={entityLink}
          >
            {entityContent}
          </Link>
        ) : entityContent}
      </Section>

      <Section
        style={{
          ...emailCalloutStyle,
          backgroundColor: '#f0f9f4',
        }}
      >
        <Text
          style={{ ...emailCalloutLabelStyle, marginBottom: '8px' }}
        >
          Resolution
        </Text>
        <Text
          style={{ ...emailCalloutTitleStyle, marginBottom: 0 }}
        >
          {resolutionType}
        </Text>
        {message && (
          <>
            <Text
              style={{ ...emailCalloutLabelStyle, marginTop: '16px', marginBottom: '8px' }}
            >
              Additional Details
            </Text>
            <Text
              style={{ ...emailTextStyle, lineHeight: '20px' }}
            >
              {message}
            </Text>
          </>
        )}
      </Section>

      <Section
        style={emailCalloutStyle}
      >
        <Text
          style={{ ...emailCalloutLabelStyle, marginBottom: '8px' }}
        >
          Your report reason
        </Text>
        <Text
          style={{ ...emailTextStyle, lineHeight: '20px' }}
        >
          {reason}
        </Text>
      </Section>

      {entityLink && (
        <Section
          style={{ margin: '20px 0' }}
        >
          <EmailButton
            href={entityLink}
            variant="primary"
            style={{ marginTop: 0 }}
          >
            View content
          </EmailButton>
        </Section>
      )}
    </EmailLayout>
  );
};

export default ReportResolvedEmail;
