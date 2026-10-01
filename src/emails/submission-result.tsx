import { Img, Link, Section, Text } from '@react-email/components';

import EmailButton from './components/EmailButton';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import { emailMutedTextStyle, emailTextStyle } from './components/styles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

interface PhotoInfo {
  url: string;
  title: string | null;
}

export const SubmissionResultEmail = ({
  preview,
  userName,
  recipientEmail,
  status,
  photos,
  challengeTitle,
  challengeLink,
  rejectionReason,
  optOutLink,
}: {
  preview?: boolean;
  userName: string;
  recipientEmail?: string;
  status: 'accepted' | 'rejected';
  photos: PhotoInfo[];
  challengeTitle: string;
  challengeLink: string;
  rejectionReason?: string | null;
  optOutLink?: string;
}) => {
  if (preview) {
    userName = 'John Smith';
    recipientEmail = 'john.smith@example.com';
    status = 'accepted';
    photos = [
      { url: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg', title: 'Golden Hour' },
      { url: 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg', title: 'City Lights' },
    ];
    challengeTitle = 'Urban Photography Challenge';
    challengeLink = `${baseUrl}/challenges/urban-photography`;
    rejectionReason = null;
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  }

  const isAccepted = status === 'accepted';
  const photoCount = photos.length;
  const isSingle = photoCount === 1;

  const previewText = isAccepted
    ? isSingle
      ? `Your photo was accepted for "${challengeTitle}"!`
      : `${photoCount} photos were accepted for "${challengeTitle}"!`
    : isSingle
      ? `Update on your submission to "${challengeTitle}"`
      : `Update on your submissions to "${challengeTitle}"`;

  return (
    <EmailLayout
      previewText={previewText}
      fullName={userName}
      recipientEmail={recipientEmail}
      optOutLink={optOutLink}
      emailType="photo_challenges"
    >
      <EmailHeading>
        {isAccepted
          ? isSingle
            ? 'Your photo was accepted!'
            : `${photoCount} photos were accepted!`
          : isSingle
            ? 'Update on your submission'
            : 'Update on your submissions'}
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {userName}
        ,
      </EmailText>
      <br />

      <EmailText>
        {isAccepted ? (
          isSingle ? (
            <>
              Great news! Your photo
              {photos[0].title ? ` "${photos[0].title}"` : ''}
              {' '}
              has been accepted for the
              {' '}
              <strong>
                {challengeTitle}
              </strong>
              {' '}
              challenge and is now visible in the challenge gallery.
            </>
          ) : (
            <>
              Great news!
              {' '}
              {photoCount}
              {' '}
              of your photos have been accepted for the
              {' '}
              <strong>
                {challengeTitle}
              </strong>
              {' '}
              challenge and are now visible in the challenge gallery.
            </>
          )
        ) : (
          isSingle ? (
            <>
              Your photo
              {photos[0].title ? ` "${photos[0].title}"` : ''}
              {' '}
              was not accepted for the
              {' '}
              <strong>
                {challengeTitle}
              </strong>
              {' '}
              challenge.
            </>
          ) : (
            <>
              {photoCount}
              {' '}
              of your photos were not accepted for the
              {' '}
              <strong>
                {challengeTitle}
              </strong>
              {' '}
              challenge.
            </>
          )
        )}
      </EmailText>

      <Section
        style={{ margin: '24px 0' }}
      >
        <table
          cellPadding="0"
          cellSpacing="4"
          style={{ borderCollapse: 'separate', margin: '0 auto' }}
        >
          <tbody>
            <tr>
              {photos.slice(0, 3).map((photo, index) => (
                <td
                  key={index}
                  style={{ padding: '2px' }}
                >
                  <Link
                    href={challengeLink}
                  >
                    <Img
                      src={photo.url}
                      alt={photo.title || `Photo ${index + 1}`}
                      width="120"
                      height="120"
                      style={{
                        borderRadius: '8px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </Link>
                </td>
              ))}
            </tr>
            {photos.length > 3 && (
              <tr>
                {photos.slice(3, 6).map((photo, index) => (
                  <td
                    key={index}
                    style={{ padding: '2px' }}
                  >
                    <Link
                      href={challengeLink}
                    >
                      <Img
                        src={photo.url}
                        alt={photo.title || `Photo ${index + 4}`}
                        width="120"
                        height="120"
                        style={{
                          borderRadius: '8px',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </Link>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
        {photos.length > 6 && (
          <Text
            style={{ ...emailMutedTextStyle, marginTop: '8px' }}
          >
            +
            {photos.length - 6}
            {' '}
            more photo
            {photos.length - 6 !== 1 ? 's' : ''}
          </Text>
        )}
      </Section>

      {!isAccepted && rejectionReason && (
        <Section
          style={{
            margin: '24px 0',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            padding: '16px',
          }}
        >
          <Text
            style={{ ...emailTextStyle, color: '#991b1b' }}
          >
            <strong>
              Reason:
            </strong>
            {' '}
            {rejectionReason}
          </Text>
        </Section>
      )}

      <Section
        style={{ margin: '32px 0' }}
      >
        <EmailButton
          href={challengeLink}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          {isAccepted ? 'View Challenge Gallery' : 'View Challenge'}
        </EmailButton>
      </Section>

      {isAccepted && (
        <EmailText
          variant="muted"
          style={{ fontSize: '14px', lineHeight: '24px' }}
        >
          Thank you for contributing to the community!
        </EmailText>
      )}

      {!isAccepted && (
        <EmailText
          variant="muted"
          style={{ fontSize: '14px', lineHeight: '24px' }}
        >
          Don&apos;t be discouraged! You can submit other photos to this or future challenges.
        </EmailText>
      )}
    </EmailLayout>
  );
};

export default SubmissionResultEmail;
