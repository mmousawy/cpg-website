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

export const ReportNotificationEmail = ({
  preview,
  adminName,
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
  optOutLink,
  isAnonymous,
}: {
  preview?: boolean;
  adminName: string;
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
  optOutLink?: string;
  isAnonymous: boolean;
}) => {
  if (preview) {
    adminName = 'Admin User';
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
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
    isAnonymous = false;
  }

  const previewText = `${reporterName} reported ${entityTitle}`;

  const entityTypeLabel = {
    photo: 'Photo',
    album: 'Album',
    profile: 'Profile',
    comment: 'Comment',
  }[entityType];

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
              New content report
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
              A new report has been submitted and is waiting for review.
            </Text>

            {/* Reported content */}
            <Section
              className="my-[20px]"
            >
              {entityLink ? (
                <Link
                  href={entityLink}
                >
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
                          className="rounded-md object-cover"
                        />
                      </Column>
                    )}
                    <Column
                      className={entityThumbnail ? 'pl-4 align-top' : 'align-top'}
                    >
                      <Text
                        className="mt-0! text-[12px] leading-[16px] text-[#666666]"
                      >
                        {entityTypeLabel}
                      </Text>
                      <Text
                        className="mt-0! text-[15px] font-semibold leading-[24px] text-[#171717]"
                      >
                        {entityTitle}
                      </Text>
                    </Column>
                  </Row>
                </Link>
              ) : (
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
                        className="rounded-md object-cover"
                      />
                    </Column>
                  )}
                  <Column
                    className={entityThumbnail ? 'pl-4 align-top' : 'align-top'}
                  >
                    <Text
                      className="mt-0! text-[12px] leading-[16px] text-[#666666]"
                    >
                      {entityTypeLabel}
                    </Text>
                    <Text
                      className="mt-0! text-[15px] font-semibold leading-[24px] text-[#171717]"
                    >
                      {entityTitle}
                    </Text>
                  </Column>
                </Row>
              )}
            </Section>

            {/* Reporter info */}
            <Section
              className="my-[20px] rounded-lg border border-[#e5e7ea] bg-[#f7f7f7] p-4"
            >
              <Row>
                <Column
                  width="40"
                  className="align-top"
                >
                  {reporterProfileLink ? (
                    <Link
                      href={reporterProfileLink}
                    >
                      {reporterAvatarUrl ? (
                        <Img
                          src={reporterAvatarUrl}
                          width="40"
                          height="40"
                          alt={reporterName}
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
                          {reporterName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                  ) : reporterAvatarUrl ? (
                    <Img
                      src={reporterAvatarUrl}
                      width="40"
                      height="40"
                      alt={reporterName}
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
                      {reporterName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Column>
                <Column
                  className="pl-3 align-top"
                >
                  {reporterProfileLink ? (
                    <Link
                      href={reporterProfileLink}
                      className="text-[#171717] no-underline"
                    >
                      <Text
                        className="my-0! mb-1! text-[14px] font-semibold leading-[20px] text-[#171717]"
                      >
                        {reporterName}
                      </Text>
                    </Link>
                  ) : (
                    <Text
                      className="my-0! mb-1! text-[14px] font-semibold leading-[20px] text-[#171717]"
                    >
                      {reporterName}
                    </Text>
                  )}
                  {isAnonymous && (
                    <Text
                      className="my-0! mb-1! text-[12px] leading-[16px] text-[#666666]"
                    >
                      Anonymous reporter
                    </Text>
                  )}
                  {reporterNickname && !isAnonymous && (
                    reporterProfileLink ? (
                      <Link
                        href={reporterProfileLink}
                        className="text-[#666666] no-underline"
                      >
                        <Text
                          className="my-0! mb-2! text-[12px] leading-[16px] text-[#666666]"
                        >
                          @
                          {reporterNickname}
                        </Text>
                      </Link>
                    ) : (
                      <Text
                        className="my-0! mb-2! text-[12px] leading-[16px] text-[#666666]"
                      >
                        @
                        {reporterNickname}
                      </Text>
                    )
                  )}
                  {reporterEmail && isAnonymous && (
                    <Text
                      className="my-0! mb-2! text-[12px] leading-[16px] text-[#666666]"
                    >
                      {reporterEmail}
                    </Text>
                  )}
                </Column>
              </Row>
            </Section>

            {/* Report reason */}
            <Section
              className="my-[20px] rounded-lg border border-[#e5e7ea] bg-[#fff5f5] p-4"
            >
              <Text
                className="my-0! mb-2! text-[12px] font-semibold uppercase leading-[16px] text-[#666666]"
              >
                Reason
              </Text>
              <Text
                className="my-0! text-[14px] leading-[20px] text-[#171717]"
              >
                {reason}
              </Text>
              {details && (
                <>
                  <Text
                    className="my-0! mb-2! mt-4! text-[12px] font-semibold uppercase leading-[16px] text-[#666666]"
                  >
                    Additional Details
                  </Text>
                  <Text
                    className="my-0! text-[14px] leading-[20px] text-[#171717]"
                  >
                    {details}
                  </Text>
                </>
              )}
            </Section>

            <div
              className="my-[20px]"
            >
              <Link
                href={reviewLink}
                className="inline-block rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
              >
                Review report
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

export default ReportNotificationEmail;
