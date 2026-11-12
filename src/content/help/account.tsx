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
          Go to Account (click your avatar in the Header → Settings) to update your screen name, bio, avatar, and interests. Under Your public profile, a preview shows how your profile looks; use the Banner image and Profile picture sections below it to upload or change your images. You can change your nickname from Account → Basic info: we&apos;ll email you a confirmation link, and you can change it once every 60 days. Old profile URLs redirect for one year.
        </p>
      ),
    },
    {
      id: 'member-tagging',
      title: 'Who can tag or @mention you',
      content: (
        <>
          <p
            className="mb-3"
          >
            Under Account → Your public profile, the checkbox
            {' '}
            <strong>
              Allow other members to tag you in comments, descriptions, and photos
            </strong>
            {' '}
            controls whether others can @mention you or place a spot tag on your photos. It is on by default for existing members.
          </p>
          <p
            className="mb-3"
          >
            When you turn it off, other people no longer see you in mention or tag pickers, existing @mentions in text stay as plain words (no link), and dots on photos are removed. Comment and description text is not rewritten. You can still @mention yourself and, on photos you own, tag yourself.
          </p>
          <p>
            This setting is separate from email: turning off
            {' '}
            <strong>
              Notifications
            </strong>
            {' '}
            under Email preferences only stops mention and tag emails and similar activity mail — it does not block others from tagging you. See
            {' '}
            <strong>
              Mentioning members (@nickname)
            </strong>
            {' '}
            and
            {' '}
            <strong>
              Tagging people on a photo
            </strong>
            {' '}
            in the Photos &amp; gallery help section for how mentions and photo tags work.
          </p>
        </>
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
      id: 'change-email',
      title: 'Changing your email address',
      content: (
        <p>
          Go to Account → Basic info and click
          {' '}
          <strong>
            Change
          </strong>
          {' '}
          next to your email. Enter the new address and we&apos;ll send a confirmation link to your current inbox. Click the link within 24 hours to finish the change. Your email stays the same until you confirm.
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
            Go to Account → Email preferences to control which emails you receive. Each category can be turned on or off independently. You can change these settings anytime.
          </p>
          <p
            className="mb-2 font-medium"
          >
            Email categories
          </p>
          <ul>
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
              — When someone comments on your photos or albums, replies to your comments, @mentions you, or tags you on a photo. In-app notifications for these always arrive; this toggle controls the follow-up email (about 15 minutes later if you have not opened the notification yet).
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
              — Sent on Sundays. A summary of unseen notifications from the past week (likes, comments, follows, uploads from people you follow, and more).
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
      id: 'danger-zone',
      title: 'Deleting your account',
      content: (
        <>
          <p>
            You can delete your account from your
            {' '}
            <strong>
              Account settings
            </strong>
            {' '}
            page. Scroll to the &quot;Danger zone&quot; section and click &quot;Delete my account&quot;.
          </p>
          <p>
            When you schedule your account for deletion:
          </p>
          <ul>
            <li>
              You will be signed out immediately and will no longer be able to log in
            </li>
            <li>
              Your content will be hidden from other users right away
            </li>
            <li>
              After 30 days, your profile, photos, albums, comments, and all associated data will be permanently removed from our servers
            </li>
          </ul>
          <p>
            Changed your mind? Contact us through the Contact page within 30 days and we can cancel the deletion.
          </p>
          <p>
            If your account was scheduled because it was inactive, signing in before the deletion date cancels the schedule and restores access. If an administrator suspended your account, only an administrator can unsuspend it before the deletion date. Some automatic suspensions at signup are removed immediately. Scene listings you submitted may stay visible without your name after your account is gone.
          </p>
        </>
      ),
    },
    {
      id: 'theme',
      title: 'Appearance',
      content: (
        <>
          <p
            className="mb-4"
          >
            In Account → Appearance you set how the site looks and moves. During signup you choose color scheme and motion; the rest of these options are only in account settings.
          </p>
          <p
            className="mb-4"
          >
            <strong>
              Color scheme.
            </strong>
            {' '}
            Auto follows your device. Light, Dark, and Midnight stay fixed.
          </p>
          <p
            className="mb-4"
          >
            <strong>
              Album card style.
            </strong>
            {' '}
            Large shows the title and author below the image. Compact shows them on hover.
          </p>
          <p
            className="mb-4"
          >
            <strong>
              Photo grid style.
            </strong>
            {' '}
            Justified rows fit the width of each photo. Square uses uniform tiles.
          </p>
          <p
            className="mb-4"
          >
            <strong>
              Photo grid density.
            </strong>
            {' '}
            Comfortable uses larger previews. Compact fits more photos on screen.
          </p>
          <p
            className="mb-4"
          >
            <strong>
              Photo captions.
            </strong>
            {' '}
            On hover, titles appear when you point at a photo. Always keeps titles and authors visible.
          </p>
          <p>
            <strong>
              Motion.
            </strong>
            {' '}
            System follows your device. Reduce minimizes animations and transitions.
          </p>
        </>
      ),
    },
    {
      id: 'activity-feed',
      title: 'Activity feed and notifications',
      content: (
        <p>
          The Activity page (Header → Notifications → View all activity) shows your notifications: likes, comments, replies, new followers, uploads from people you follow, event reminders and announcements, challenge results and announcements, shared-album invites and requests, and report resolutions. Notifications are grouped by time (Today, Yesterday, This week, Earlier). You can mark them as seen or dismiss them.
        </p>
      ),
    },
    {
      id: 'your-stats',
      title: 'Your stats',
      content: (
        <p>
          Open
          {' '}
          <strong>
            My stats
          </strong>
          {' '}
          from your avatar menu to see how your content is doing: photo and album counts, views, likes, comments, followers, events attended, challenge participation, and storage used. Charts show activity over time — switch the range (for example last 30 days) to zoom in.
        </p>
      ),
    },
    {
      id: 'your-gear',
      title: 'Your gear',
      content: (
        <p>
          Open
          {' '}
          <strong>
            My gear
          </strong>
          {' '}
          from your avatar menu to update shooting formats, your daily driver camera body and lens, and a full inventory (bodies, lenses, film, lighting, and more). Search the catalog as you add items. A short summary appears on your profile; the full list is on your public gear page. You can change all of this anytime after onboarding.
        </p>
      ),
    },
    {
      id: 'social-links',
      title: 'Social links and website',
      content: (
        <p>
          On your public profile, you can add a website URL and up to 3 social links. Icons are auto-detected for common platforms. Each link is checked before it appears publicly: personal portfolios and social profiles are allowed; sites that look like advertisements or unsafe links are not published. Allowed links show the domain or platform name, not the custom label you type.
        </p>
      ),
    },
    {
      id: 'account-review',
      title: 'Profile review after signup',
      content: (
        <>
          <p
            className="mb-4"
          >
            When you finish onboarding, we check your profile text and any links. If everything looks like a normal photographer profile, your page goes public right away. A display name that looks like a business can be held for review even if you have not added a website yet.
          </p>
          <p
            className="mb-4"
          >
            If a link or your display name needs a closer look, you stay signed in and can browse the site, but likes, comments, follows, and other interactions stay locked. Your profile is not public yet and account pages stay locked until a moderator approves you. The same review can run later if you add a website from your account.
          </p>
          <p>
            Accounts that look like spam or advertising, or that closely match a suspended account, are not allowed on the site. If access from your network was blocked after a suspension, contact us through the Contact page and we can help.
          </p>
        </>
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
