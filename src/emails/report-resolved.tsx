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

export const ReportResolvedEmail = ({
  reporterName,
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

  // Format entity title with details similar to ReportModal
  const getFormattedEntityTitle = () => {
    if (entityType === 'photo') {
      // Extract base title (before any parentheses we added)
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

  // Format date
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
              Your report has been resolved
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Hi
              {' '}
              {reporterName}
              ,
            </Text>
            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Thank you for helping keep our community safe. Your report has been reviewed and resolved.
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
                        {getFormattedEntityTitle()}
                      </Text>
                      {(entityCreatedAt || (entityType === 'album' && entityPhotoCount !== null)) && (
                        <Text
                          className="mt-1! text-[12px] leading-[16px] text-[#666666]"
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
                      )}
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

            {/* Resolution info */}
            <Section
              className="my-[20px] rounded-lg border border-[#e5e7ea] bg-[#f0f9f4] p-4"
            >
              <Text
                className="my-0! mb-2! text-[12px] font-semibold uppercase leading-[16px] text-[#666666]"
              >
                Resolution
              </Text>
              <Text
                className="my-0! text-[14px] font-semibold leading-[20px] text-[#171717]"
              >
                {resolutionType}
              </Text>
              {message && (
                <>
                  <Text
                    className="my-0! mb-2! mt-4! text-[12px] font-semibold uppercase leading-[16px] text-[#666666]"
                  >
                    Additional Details
                  </Text>
                  <Text
                    className="my-0! text-[14px] leading-[20px] text-[#171717]"
                  >
                    {message}
                  </Text>
                </>
              )}
            </Section>

            {/* Original report reason */}
            <Section
              className="my-[20px] rounded-lg border border-[#e5e7ea] bg-[#f7f7f7] p-4"
            >
              <Text
                className="my-0! mb-2! text-[12px] font-semibold uppercase leading-[16px] text-[#666666]"
              >
                Your report reason
              </Text>
              <Text
                className="my-0! text-[14px] leading-[20px] text-[#171717]"
              >
                {reason}
              </Text>
            </Section>

            {entityLink && (
              <div
                className="my-[20px]"
              >
                <Link
                  href={entityLink}
                  className="inline-block rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
                >
                  View content
                </Link>
              </div>
            )}

            <Footer
              fullName={reporterName}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ReportResolvedEmail;
