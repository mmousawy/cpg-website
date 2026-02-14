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

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

import Footer from './components/Footer';
import EmailHeader from './components/Header';

interface PhotoInfo {
  url: string;
  title: string | null;
}

export const SubmissionResultEmail = ({
  preview,
  userName,
  status,
  photos,
  challengeTitle,
  challengeLink,
  rejectionReason,
  optOutLink,
}: {
  preview?: boolean;
  userName: string;
  status: 'accepted' | 'rejected';
  photos: PhotoInfo[];
  challengeTitle: string;
  challengeLink: string;
  rejectionReason?: string | null;
  optOutLink?: string;
}) => {
  if (preview) {
    userName = 'John Smith';
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
    <Html>
      <Head />
      <Preview>
        {previewText}
      </Preview>
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
              {isAccepted
                ? isSingle
                  ? 'Your photo was accepted!'
                  : `${photoCount} photos were accepted!`
                : isSingle
                  ? 'Update on your submission'
                  : 'Update on your submissions'}
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Hi
              {' '}
              {userName}
              ,
            </Text>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
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
            </Text>

            {/* Photo thumbnails grid */}
            <Section
              className="my-[24px]"
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
                  className="mt-2! text-center text-[12px] text-[#666666]"
                >
                  +
                  {photos.length - 6}
                  {' '}
                  more photo
                  {photos.length - 6 !== 1 ? 's' : ''}
                </Text>
              )}
            </Section>

            {/* Rejection reason */}
            {!isAccepted && rejectionReason && (
              <Section
                className="my-[24px] rounded-lg bg-[#fef2f2] p-4"
              >
                <Text
                  className="m-0 text-[14px] leading-[24px] text-[#991b1b]"
                >
                  <strong>
                    Reason:
                  </strong>
                  {' '}
                  {rejectionReason}
                </Text>
              </Section>
            )}

            {/* CTA Button */}
            <Section
              className="mb-[32px] mt-[32px] text-center"
            >
              <Link
                href={challengeLink}
                className="inline-block rounded-full bg-[#171717] px-[24px] py-[12px] text-center text-[12px] font-semibold text-white no-underline"
              >
                {isAccepted ? 'View Challenge Gallery' : 'View Challenge'}
              </Link>
            </Section>

            {isAccepted && (
              <Text
                className="text-[14px] leading-[24px] text-[#666666]"
              >
                Thank you for contributing to the community!
              </Text>
            )}

            {!isAccepted && (
              <Text
                className="text-[14px] leading-[24px] text-[#666666]"
              >
                Don&apos;t be discouraged! You can submit other photos to this or future challenges.
              </Text>
            )}

            <Footer
              optOutLink={optOutLink}
              emailType="photo_challenges"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SubmissionResultEmail;
