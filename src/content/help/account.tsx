import type { FAQSection } from './types';

export const accountFAQ: FAQSection = {
  id: 'account',
  title: 'Account & settings',
  items: [
    {
      id: 'update-profile',
      title: 'Updating your profile',
      content: (
        <p>
          Go to Account (click your avatar in the Header → Settings) to update your full name, bio, avatar, and interests. Click the avatar area to change your profile picture. Your nickname is set during onboarding and may require contacting support to change.
        </p>
      ),
    },
    {
      id: 'change-password',
      title: 'Changing your password',
      content: (
        <p>
          If you signed up with email and password, use the &quot;Forgot password&quot; link on the login page to reset your password. You&apos;ll receive an email with a link to set a new one. If you signed up with Google or Discord, you manage your password through those services.
        </p>
      ),
    },
    {
      id: 'notifications',
      title: 'Email notifications and preferences',
      content: (
        <>
          <p
            className="mb-4"
          >
            Go to Account → App preferences to control which emails you receive. Each category can be turned on or off independently. You can change these settings anytime.
          </p>
          <p
            className="mb-2 font-medium"
          >
            Email categories
          </p>
          <ul
            className="mb-4 list-disc space-y-2 pl-5 text-foreground/90"
          >
            <li>
              <strong>
                Events
              </strong>
              {' '}
              — New event announcements and RSVP reminders (e.g. 5 days before an event if you haven&apos;t RSVP&apos;d). Attendee reminders (1 day before) are always sent when you&apos;ve confirmed.
            </li>
            <li>
              <strong>
                Notifications
              </strong>
              {' '}
              — When someone comments on your photos, albums, or replies to your comments.
            </li>
            <li>
              <strong>
                Photo challenges
              </strong>
              {' '}
              — New challenge announcements and results (accepted/rejected).
            </li>
            <li>
              <strong>
                Challenge comments
              </strong>
              {' '}
              — When someone comments on a challenge you participated in.
            </li>
            <li>
              <strong>
                Weekly digest
              </strong>
              {' '}
              — A weekly summary of activity and notifications.
            </li>
            <li>
              <strong>
                Newsletter
              </strong>
              {' '}
              — General announcements and community updates.
            </li>
          </ul>
          <p>
            Notification and announcement emails include an unsubscribe link at the bottom. Clicking it lets you opt out of that category without visiting account settings. Transactional emails (e.g. RSVP confirmations) do not include unsubscribe links.
          </p>
        </>
      ),
    },
    {
      id: 'delete-account',
      title: 'Deleting your account',
      content: (
        <p>
          Account deletion is a permanent action. If you wish to delete your account, please contact us through the Contact page. We&apos;ll guide you through the process and remove your data in accordance with our Privacy Policy.
        </p>
      ),
    },
    {
      id: 'theme',
      title: 'Theme and display preferences',
      content: (
        <p>
          In account settings, you can choose your theme:
          {' '}
          <strong>
            Auto
          </strong>
          {' '}
          (follows your system preference),
          {' '}
          <strong>
            Light
          </strong>
          , or
          {' '}
          <strong>
            Dark
          </strong>
          . You can also set the gallery card style to
          {' '}
          <strong>
            Large
          </strong>
          {' '}
          (info below the image) or
          {' '}
          <strong>
            Compact
          </strong>
          {' '}
          (info on hover).
        </p>
      ),
    },
    {
      id: 'activity-feed',
      title: 'Activity feed and notifications',
      content: (
        <p>
          The Activity page (Header → Notifications → View all notifications) shows your notifications: likes, comments, replies, follows, event reminders and announcements, challenge results and announcements, and report resolutions. Notifications are grouped by time (Today, Yesterday, This week, Earlier). You can mark them as seen or dismiss them.
        </p>
      ),
    },
    {
      id: 'social-links',
      title: 'Social links and website',
      content: (
        <p>
          On your public profile, you can add a website URL and up to 3 social links. Icons are auto-detected for common platforms. These appear on your profile so others can connect with you elsewhere.
        </p>
      ),
    },
    {
      id: 'interests-profile',
      title: 'Interests on your profile',
      content: (
        <p>
          You can add up to 10 interests to your profile (e.g. &quot;street photography&quot;, &quot;analog&quot;). These help other members discover you on the Members page when they browse by interests or photo style.
        </p>
      ),
    },
  ],
};
