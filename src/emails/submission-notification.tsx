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
    photoCount = 2;
    challengeTitle = 'Urban Photography Challenge';
    challengeThumbnail = 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg';
    challengeLink = `${baseUrl}/challenges/urban-photography`;
    reviewLink = `${baseUrl}/admin/challenges/urban-photography/submissions`;
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  }

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
