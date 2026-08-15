import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

import Footer from './components/Footer';
import EmailHeader from './components/Header';

export type MemberNotificationKind = 'signed_up' | 'joined' | 'deleted';

export const MemberNotificationEmail = ({
  preview,
  kind = 'joined',
  adminName = 'Admin',
  memberName = 'A member',
  memberNickname = null,
  memberEmail = null,
  profileLink = null,
  membersLink = '',
  deletionDate,
  initiatedByAdmin,
  initiatedByName,
}: {
  preview?: boolean;
  kind?: MemberNotificationKind;
  adminName?: string;
  memberName?: string;
  memberNickname?: string | null;
  memberEmail?: string | null;
  profileLink?: string | null;
  membersLink?: string;
  deletionDate?: string;
  initiatedByAdmin?: boolean;
  initiatedByName?: string | null;
}) => {
  if (preview) {
    adminName = 'Admin User';
    memberName = 'Jane Doe';
    memberNickname = 'janedoe';
    memberEmail = 'jane@example.com';
    profileLink = 'https://creativephotography.group/@janedoe';
    membersLink = 'https://creativephotography.group/admin/members';
    deletionDate = 'September 14, 2026';
    initiatedByAdmin = false;
    initiatedByName = null;
  }

  const isDeleted = kind === 'deleted';
  const isSignedUp = kind === 'signed_up';
  let heading = 'New member joined';
  let previewText = `${memberName} joined the community`;
  if (isDeleted) {
    heading = 'Member account scheduled for deletion';
    previewText = `${memberName} scheduled their account for deletion`;
  } else if (isSignedUp) {
    heading = 'New signup';
    previewText = `${memberName} signed up`;
  }
  const ctaHref = isDeleted || isSignedUp ? membersLink : (profileLink || membersLink);
  const ctaLabel = isDeleted || isSignedUp ? 'View members' : 'View profile';
  let introText = `${memberName} has completed onboarding and joined the community.`;
  if (isDeleted) {
    introText = initiatedByAdmin
      ? `${initiatedByName || 'An admin'} scheduled ${memberName}'s account for deletion.`
      : `${memberName} has scheduled their account for deletion.`;
  } else if (isSignedUp) {
    introText = `${memberName} signed up and hasn't finished setting up their profile yet.`;
  }

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
              {heading}
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
              {introText}
            </Text>

            <Section
              className="my-[20px] rounded-lg border border-[#e5e7ea] bg-[#f7f7f7] p-4"
            >
              <Text
                className="my-0! mb-1! text-[12px] font-semibold uppercase leading-[16px] text-[#666666]"
              >
                Member
              </Text>
              <Text
                className="my-0! mb-2! text-[14px] font-semibold leading-[20px] text-[#171717]"
              >
                {memberName}
              </Text>
              {memberNickname && (
                <Text
                  className="my-0! mb-1! text-[12px] leading-[16px] text-[#666666]"
                >
                  @
                  {memberNickname}
                </Text>
              )}
              {memberEmail && (
                <Text
                  className="my-0! text-[12px] leading-[16px] text-[#666666]"
                >
                  {memberEmail}
                </Text>
              )}
            </Section>

            {isDeleted && deletionDate && (
              <Text
                className="text-[14px] leading-[24px] text-[#171717]"
              >
                Their profile and content are hidden now. Permanent deletion is scheduled for
                {' '}
                {deletionDate}
                .
              </Text>
            )}

            <div
              className="my-[20px]"
            >
              <Link
                href={ctaHref}
                className="inline-block rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
              >
                {ctaLabel}
              </Link>
            </div>

            <Footer
              fullName={adminName}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MemberNotificationEmail;
