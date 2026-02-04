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

export const SubmissionNotificationEmail = ({
  preview,
  adminName,
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
  optOutLink,
}: {
  preview?: boolean;
  adminName: string;
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
  optOutLink?: string;
}) => {
  if (preview) {
    adminName = 'Admin User';
    submitterName = 'John Smith';
    submitterNickname = 'johnsmith';
    submitterAvatarUrl = 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-avatar.jpg';
    submitterProfileLink = `${baseUrl}/@johnsmith`;
    photoCount = 3;
    photoUrls = [
      'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg',
      'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg',
      'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg',
    ];
    challengeTitle = 'Urban Photography Challenge';
    challengeThumbnail = 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg';
    challengeLink = `${baseUrl}/challenges/urban-photography`;
    reviewLink = `${baseUrl}/admin/challenges/urban-photography/submissions`;
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  }

  // Display up to 6 photos in the email
  const displayPhotos = (photoUrls || []).slice(0, 6);
  const remainingPhotos = photoCount - displayPhotos.length;

  const previewText = `${submitterName} submitted ${photoCount} photo${photoCount !== 1 ? 's' : ''} to "${challengeTitle}"`;

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
              New challenge submission
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Hi
              {' '}
              {adminName}
              ,
            </Text>
            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              A new submission has been made to one of your challenges and is waiting for review.
            </Text>

            {/* Challenge thumbnail and title */}
            <Section
              className="my-[20px]"
            >
              <Link
                href={challengeLink}
              >
                <Row>
                  {challengeThumbnail && (
                    <Column
                      width="64"
                    >
                      <Img
                        src={challengeThumbnail}
                        width="64"
                        height="64"
                        alt={challengeTitle}
                        className="rounded-md object-cover"
                      />
                    </Column>
                  )}
                  <Column
                    className={challengeThumbnail ? 'pl-4 align-top' : 'align-top'}
                  >
                    <Text
                      className="mt-0! text-[15px] font-semibold leading-[24px] text-[#171717]"
                    >
                      {challengeTitle}
                    </Text>
                  </Column>
                </Row>
              </Link>
            </Section>

            {/* Submitter info */}
            <Section
              className="my-[20px] rounded-lg border border-[#e5e7ea] bg-[#f7f7f7] p-4"
            >
              <Row>
                <Column
                  width="40"
                  className="align-top"
                >
                  {submitterProfileLink ? (
                    <Link
                      href={submitterProfileLink}
                    >
                      {submitterAvatarUrl ? (
                        <Img
                          src={submitterAvatarUrl}
                          width="40"
                          height="40"
                          alt={submitterName}
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
                          {submitterName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                  ) : submitterAvatarUrl ? (
                    <Img
                      src={submitterAvatarUrl}
                      width="40"
                      height="40"
                      alt={submitterName}
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
                      {submitterName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Column>
                <Column
                  className="pl-3 align-top"
                >
                  {submitterProfileLink ? (
                    <Link
                      href={submitterProfileLink}
                      className="text-[#171717] no-underline"
                    >
                      <Text
                        className="my-0! mb-1! text-[14px] font-semibold leading-[20px] text-[#171717]"
                      >
                        {submitterName}
                      </Text>
                    </Link>
                  ) : (
                    <Text
                      className="my-0! mb-1! text-[14px] font-semibold leading-[20px] text-[#171717]"
                    >
                      {submitterName}
                    </Text>
                  )}
                  {submitterNickname && (
                    submitterProfileLink ? (
                      <Link
                        href={submitterProfileLink}
                        className="text-[#666666] no-underline"
                      >
                        <Text
                          className="my-0! mb-2! text-[12px] leading-[16px] text-[#666666]"
                        >
                          @
                          {submitterNickname}
                        </Text>
                      </Link>
                    ) : (
                      <Text
                        className="my-0! mb-2! text-[12px] leading-[16px] text-[#666666]"
                      >
                        @
                        {submitterNickname}
                      </Text>
                    )
                  )}
                  <Text
                    className="my-0! text-[14px] leading-[20px] text-[#171717]"
                  >
                    Submitted
                    {' '}
                    {photoCount}
                    {' '}
                    photo
                    {photoCount !== 1 ? 's' : ''}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Submitted photos grid */}
            {displayPhotos.length > 0 && (
              <Section
                className="my-[20px]"
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
                    className="mt-2! text-[12px] text-[#666666]"
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

            <div
              className="my-[20px]"
            >
              <Link
                href={reviewLink}
                className="inline-block rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
              >
                Review submission
              </Link>
            </div>

            <Footer
              fullName={adminName}
              optOutLink={optOutLink}
              emailType="admin_notifications"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SubmissionNotificationEmail;
