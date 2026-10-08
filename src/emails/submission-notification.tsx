import { Column, Img, Link, Row, Section, Text } from '@react-email/components';

import EmailButton from './components/EmailButton';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import {
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

export const SubmissionNotificationEmail = ({
  preview,
  adminName,
  recipientEmail,
  submitterName,
  submitterNickname,
  submitterAvatarUrl,
  submitterProfileLink,
  photoCount,
  photoUrls,
  challengeTitle,
  challengeThumbnail,
  challengeLink,
  reviewLink,
}: {
  preview?: boolean;
  adminName: string;
  recipientEmail?: string;
  submitterName: string;
  submitterNickname: string | null;
  submitterAvatarUrl: string | null;
  submitterProfileLink: string | null;
  photoCount: number;
  photoUrls?: string[];
  challengeTitle: string;
  challengeThumbnail: string | null;
  challengeLink: string;
  reviewLink: string;
}) => {
  const data = preview
    ? {
      adminName: 'Admin User',
      recipientEmail: 'admin@example.com',
      submitterName: 'John Smith',
      submitterNickname: 'johnsmith' as string | null,
      submitterAvatarUrl:
          'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-avatar.jpg',
      submitterProfileLink: `${baseUrl}/@johnsmith`,
      photoCount: 3,
      photoUrls: [
        'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg',
        'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg',
        'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg',
      ],
      challengeTitle: 'Urban Photography Challenge',
      challengeThumbnail:
          'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg',
      challengeLink: `${baseUrl}/challenges/urban-photography`,
      reviewLink: `${baseUrl}/admin/challenges/urban-photography/submissions`,
    }
    : {
      adminName,
      recipientEmail,
      submitterName,
      submitterNickname,
      submitterAvatarUrl,
      submitterProfileLink,
      photoCount,
      photoUrls,
      challengeTitle,
      challengeThumbnail,
      challengeLink,
      reviewLink,
    };

  const displayPhotos = (data.photoUrls || []).slice(0, 6);
  const remainingPhotos = data.photoCount - displayPhotos.length;

  const previewText = `${data.submitterName} submitted ${data.photoCount} photo${data.photoCount !== 1 ? 's' : ''} to "${data.challengeTitle}"`;

  const renderAvatar = () => {
    if (data.submitterProfileLink) {
      return (
        <Link
          href={data.submitterProfileLink}
        >
          {data.submitterAvatarUrl ? (
            <Img
              src={data.submitterAvatarUrl}
              width="40"
              height="40"
              alt={data.submitterName}
              style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={avatarPlaceholderStyle}
            >
              {data.submitterName.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      );
    }
    if (data.submitterAvatarUrl) {
      return (
        <Img
          src={data.submitterAvatarUrl}
          width="40"
          height="40"
          alt={data.submitterName}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
        />
      );
    }
    return (
      <div
        style={avatarPlaceholderStyle}
      >
        {data.submitterName.charAt(0).toUpperCase()}
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
        New challenge submission
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {data.adminName}
        ,
      </EmailText>
      <br />
      <EmailText>
        A new submission has been made to one of your challenges and is waiting for review.
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        <Link
          href={data.challengeLink}
        >
          <Row>
            {data.challengeThumbnail && (
              <Column
                width="64"
              >
                <Img
                  src={data.challengeThumbnail}
                  width="64"
                  height="64"
                  alt={data.challengeTitle}
                  style={{ borderRadius: '6px', objectFit: 'cover' }}
                />
              </Column>
            )}
            <Column
              style={{ verticalAlign: 'top', paddingLeft: data.challengeThumbnail ? '16px' : 0 }}
            >
              <Text
                style={{ ...emailCalloutTitleStyle, fontSize: '15px', lineHeight: '24px', margin: 0 }}
              >
                {data.challengeTitle}
              </Text>
            </Column>
          </Row>
        </Link>
      </Section>

      <Section
        style={emailCalloutStyle}
      >
        <Row>
          <Column
            width="40"
            style={{ verticalAlign: 'top' }}
          >
            {renderAvatar()}
          </Column>
          <Column
            style={{ verticalAlign: 'top', paddingLeft: '12px' }}
          >
            {data.submitterProfileLink ? (
              <Link
                href={data.submitterProfileLink}
                style={{ color: emailTextStyle.color, textDecoration: 'none' }}
              >
                <Text
                  style={{ ...emailCalloutTitleStyle, marginBottom: '4px' }}
                >
                  {data.submitterName}
                </Text>
              </Link>
            ) : (
              <Text
                style={{ ...emailCalloutTitleStyle, marginBottom: '4px' }}
              >
                {data.submitterName}
              </Text>
            )}
            {data.submitterNickname && (
              data.submitterProfileLink ? (
                <Link
                  href={data.submitterProfileLink}
                  style={{ textDecoration: 'none' }}
                >
                  <Text
                    style={{ ...emailMutedTextStyle, marginBottom: '8px', lineHeight: '16px' }}
                  >
                    @
                    {data.submitterNickname}
                  </Text>
                </Link>
              ) : (
                <Text
                  style={{ ...emailMutedTextStyle, marginBottom: '8px', lineHeight: '16px' }}
                >
                  @
                  {data.submitterNickname}
                </Text>
              )
            )}
            <Text
              style={{ ...emailTextStyle, lineHeight: '20px' }}
            >
              Submitted
              {' '}
              {data.photoCount}
              {' '}
              photo
              {data.photoCount !== 1 ? 's' : ''}
            </Text>
          </Column>
        </Row>
      </Section>

      {displayPhotos.length > 0 && (
        <Section
          style={{ margin: '20px 0' }}
        >
          <table
            cellPadding="0"
            cellSpacing="4"
            style={{ borderCollapse: 'separate' }}
          >
            <tbody>
              <tr>
                {displayPhotos.slice(0, 3).map((url, index) => (
                  <td
                    key={index}
                    style={{ padding: '2px' }}
                  >
                    <Img
                      src={url}
                      width="120"
                      height="120"
                      alt={`Submitted photo ${index + 1}`}
                      style={{
                        borderRadius: '4px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </td>
                ))}
              </tr>
              {displayPhotos.length > 3 && (
                <tr>
                  {displayPhotos.slice(3, 6).map((url, index) => (
                    <td
                      key={index}
                      style={{ padding: '2px' }}
                    >
                      <Img
                        src={url}
                        width="120"
                        height="120"
                        alt={`Submitted photo ${index + 4}`}
                        style={{
                          borderRadius: '4px',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
          {remainingPhotos > 0 && (
            <Text
              style={{ ...emailMutedTextStyle, marginTop: '8px' }}
            >
              +
              {remainingPhotos}
              {' '}
              more photo
              {remainingPhotos !== 1 ? 's' : ''}
            </Text>
          )}
        </Section>
      )}

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={data.reviewLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          Review submission
        </EmailButton>
      </Section>
    </EmailLayout>
  );
};

export default SubmissionNotificationEmail;
