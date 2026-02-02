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

export const SubmissionResultEmail = ({
  preview,
  userName,
  status,
  photoUrl,
  photoTitle,
  challengeTitle,
  challengeLink,
  rejectionReason,
  optOutLink,
}: {
  preview?: boolean;
  userName: string;
  status: 'accepted' | 'rejected';
  photoUrl: string;
  photoTitle: string | null;
  challengeTitle: string;
  challengeLink: string;
  rejectionReason?: string | null;
  optOutLink?: string;
}) => {
  if (preview) {
    userName = 'John Smith';
    status = 'accepted';
    photoUrl = 'https://lpdjlhlslqtdswhnchmv.supabase.co/storage/v1/object/public/cpg-bucket/sample-image.jpg';
    photoTitle = 'Golden Hour';
    challengeTitle = 'Urban Photography Challenge';
    challengeLink = `${baseUrl}/challenges/urban-photography`;
    rejectionReason = null;
    optOutLink = `${baseUrl}/unsubscribe/preview-token`;
  }

  const isAccepted = status === 'accepted';
  const previewText = isAccepted
    ? `Your photo was accepted for "${challengeTitle}"!`
    : `Update on your submission to "${challengeTitle}"`;

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
                ? 'Your photo was accepted!'
                : 'Update on your submission'}
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
                <>
                  Great news! Your photo
                  {photoTitle ? ` "${photoTitle}"` : ''}
                  {' '}
                  has been accepted for
                  the
                  <strong>
                    {challengeTitle}
                  </strong>
                  {' '}
                  challenge and is now
                  visible in the challenge gallery.
                </>
              ) : (
                <>
                  Your photo
                  {photoTitle ? ` "${photoTitle}"` : ''}
                  {' '}
                  was not accepted for
                  the
                  <strong>
                    {challengeTitle}
                  </strong>
                  {' '}
                  challenge.
                </>
              )}
            </Text>

            {/* Photo thumbnail */}
            <Section
              className="my-[24px]"
            >
              <Row>
                <Column
                  align="center"
                  className="w-full"
                >
                  <Link
                    href={challengeLink}
                  >
                    <Img
                      src={photoUrl}
                      alt={photoTitle || 'Your submission'}
                      width={200}
                      height={200}
                      className="rounded-lg object-cover"
                      style={{
                        objectFit: 'cover',
                        width: '200px',
                        height: '200px',
                      }}
                    />
                  </Link>
                </Column>
              </Row>
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
                Don&apos;t be discouraged! You can submit other photos to this
                or future challenges.
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
