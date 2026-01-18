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

export const CommentNotificationEmail = ({
  preview,
  ownerName,
  commenterName,
  commenterNickname,
  commenterAvatarUrl,
  commenterProfileLink,
  commentText,
  entityType,
  entityTitle,
  entityThumbnail,
  entityLink,
  optOutLink,
}: {
  preview?: boolean;
  ownerName: string;
  commenterName: string;
  commenterNickname: string | null;
  commenterAvatarUrl: string | null;
  commenterProfileLink: string | null;
  commentText: string;
  entityType: 'album' | 'photo' | 'event';
  entityTitle: string;
  entityThumbnail: string | null;
  entityLink: string;
  optOutLink?: string;
}) => {
  if (preview) {
    ownerName = 'Jane Doe';
    commenterName = 'John Smith';
    commenterNickname = 'johnsmith';
    commenterAvatarUrl = 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-avatar.jpg';
    commenterProfileLink = `${baseUrl}/@johnsmith`;
    commentText = 'This is a sample comment on your album. Great work!';
    entityType = 'album';
    entityTitle = 'My Photography Album';
    entityThumbnail = 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg';
    entityLink = `${baseUrl}/@johndoe/my-album`;
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  }

  const previewText = `${commenterName} commented on your ${entityType}`;

  // Truncate comment text if too long
  const displayComment = commentText.length > 200
    ? commentText.substring(0, 200) + '...'
    : commentText;

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
              New comment on your
              {' '}
              {entityType === 'album' ? 'album' : 'photo'}
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Hi
              {' '}
              {ownerName}
              ,
            </Text>
            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Someone commented on your
              {' '}
              {entityType}
              :
            </Text>

            {/* Entity thumbnail and title */}
            <Section
              className="my-[20px]"
            >
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
                      className="mt-0! text-[15px] font-semibold leading-[24px] text-[#171717]"
                    >
                      {entityTitle}
                    </Text>
                  </Column>
                </Row>
              </Link>
            </Section>

            {/* Comment styled like in the app */}
            <Section
              className="my-[20px] rounded-lg border border-[#e5e7ea] bg-[#f7f7f7] p-4"
            >
              <Row>
                <Column
                  width="40"
                  className="align-top"
                >
                  {commenterProfileLink ? (
                    <Link
                      href={commenterProfileLink}
                    >
                      {commenterAvatarUrl ? (
                        <Img
                          src={commenterAvatarUrl}
                          width="40"
                          height="40"
                          alt={commenterName}
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
                          {commenterName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                  ) : (
                    <>
                      {commenterAvatarUrl ? (
                        <Img
                          src={commenterAvatarUrl}
                          width="40"
                          height="40"
                          alt={commenterName}
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
                          {commenterName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </>
                  )}
                </Column>
                <Column
                  className="pl-3 align-top"
                >
                  {commenterProfileLink ? (
                    <Link
                      href={commenterProfileLink}
                      className="text-[#171717] no-underline"
                    >
                      <Text
                        className="my-0! mb-1! text-[14px] font-semibold leading-[20px] text-[#171717]"
                      >
                        {commenterName}
                      </Text>
                    </Link>
                  ) : (
                    <Text
                      className="my-0! mb-1! text-[14px] font-semibold leading-[20px] text-[#171717]"
                    >
                      {commenterName}
                    </Text>
                  )}
                  {commenterNickname && (
                    commenterProfileLink ? (
                      <Link
                        href={commenterProfileLink}
                        className="text-[#666666] no-underline"
                      >
                        <Text
                          className="my-0! mb-2! text-[12px] leading-[16px] text-[#666666]"
                        >
                          @
                          {commenterNickname}
                        </Text>
                      </Link>
                    ) : (
                      <Text
                        className="my-0! mb-2! text-[12px] leading-[16px] text-[#666666]"
                      >
                        @
                        {commenterNickname}
                      </Text>
                    )
                  )}
                  <Text
                    className="my-0! text-[14px] leading-[20px] text-[#171717] whitespace-pre-wrap"
                  >
                    {displayComment}
                  </Text>
                </Column>
              </Row>
            </Section>

            <div
              className="my-[20px]"
            >
              <Link
                href={entityLink}
                className="inline-block rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
              >
                View comment
              </Link>
            </div>

            <Footer
              fullName={ownerName}
              optOutLink={optOutLink}
              emailType="notifications"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default CommentNotificationEmail;
