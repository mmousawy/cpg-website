import { Section } from '@react-email/components';

import EmailButton from './components/EmailButton';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import {
  emailCalloutLabelStyle,
  emailCalloutStyle,
  emailCalloutTitleStyle,
  emailMutedTextStyle,
} from './components/styles';

export type MemberNotificationKind = 'signed_up' | 'joined' | 'deleted';

export const MemberNotificationEmail = ({
  preview,
  kind = 'joined',
  adminName = 'Admin',
  recipientEmail,
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
  recipientEmail?: string;
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
    recipientEmail = 'admin@example.com';
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
    <EmailLayout
      previewText={previewText}
      fullName={adminName}
      recipientEmail={recipientEmail}
    >
      <EmailHeading>
        {heading}
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {adminName}
        ,
      </EmailText>
      <br />
      <EmailText>
        {introText}
      </EmailText>

      <Section
        style={emailCalloutStyle}
      >
        <EmailText
          variant="muted"
          style={emailCalloutLabelStyle}
        >
          Member
        </EmailText>
        <EmailText
          style={emailCalloutTitleStyle}
        >
          {memberName}
        </EmailText>
        {memberNickname && (
          <EmailText
            variant="muted"
            style={{ ...emailMutedTextStyle, marginBottom: '4px', lineHeight: '16px' }}
          >
            @
            {memberNickname}
          </EmailText>
        )}
        {memberEmail && (
          <EmailText
            variant="muted"
            style={{ lineHeight: '16px' }}
          >
            {memberEmail}
          </EmailText>
        )}
      </Section>

      {isDeleted && deletionDate && (
        <EmailText>
          Their profile and content are hidden now. Permanent deletion is scheduled for
          {' '}
          {deletionDate}
          .
        </EmailText>
      )}

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={ctaHref}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          {ctaLabel}
        </EmailButton>
      </Section>
    </EmailLayout>
  );
};

export default MemberNotificationEmail;
