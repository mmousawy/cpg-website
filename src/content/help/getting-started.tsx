import type { FAQSection } from './types';

const Kbd = ({ children }: { children: string }) => (
  <kbd
    className="rounded border border-foreground/20 bg-muted px-1.5 py-0.5 font-mono text-xs"
  >
    {children}
  </kbd>
);

export const gettingStartedFAQ: FAQSection = {
  id: 'getting-started',
  title: 'Getting started',
  items: [
    {
      id: 'create-account',
      title: 'How to create an account',
      content: (
        <>
          <p
            className="mb-3"
          >
            You can sign up in three ways:
          </p>
          <ul
            className="mb-4 ml-6 list-disc"
          >
            <li>
              <strong>
                Email and password
              </strong>
              {' '}
              — Enter your email and choose a password (at least 6 characters). You&apos;ll receive a confirmation link to activate your account.
            </li>
            <li>
              <strong>
                Google
              </strong>
              {' '}
              — Click &quot;Continue with Google&quot; to sign up using your Google account.
            </li>
            <li>
              <strong>
                Discord
              </strong>
              {' '}
              — Click &quot;Continue with Discord&quot; to sign up using your Discord account.
            </li>
          </ul>
          <p>
            After signing up, you&apos;ll be asked to complete your profile (nickname, avatar, bio) before accessing the full site.
          </p>
        </>
      ),
    },
    {
      id: 'setup-profile',
      title: 'Setting up your profile',
      content: (
        <>
          <p
            className="mb-3"
          >
            During onboarding, you&apos;ll set up:
          </p>
          <ul
            className="mb-4 ml-6 list-disc"
          >
            <li>
              <strong>
                Nickname
              </strong>
              {' '}
              — A unique username (e.g. @johndoe) that appears in your profile URL. This cannot be changed easily later.
            </li>
            <li>
              <strong>
                Profile picture
              </strong>
              {' '}
              — A profile photo. You can upload one or skip and add it later.
            </li>
            <li>
              <strong>
                Full name and bio
              </strong>
              {' '}
              — Optional. Helps others get to know you.
            </li>
            <li>
              <strong>
                Interests
              </strong>
              {' '}
              — Optional tags like &quot;street photography&quot; or &quot;analog&quot; that help you connect with like-minded members.
            </li>
            <li>
              <strong>
                Email preferences
              </strong>
              {' '}
              — Choose whether to receive notifications about events and activity.
            </li>
          </ul>
          <p>
            You can update most of these later from your account settings.
          </p>
        </>
      ),
    },
    {
      id: 'navigating',
      title: 'Navigating the website',
      content: (
        <>
          <p
            className="mb-3"
          >
            The main sections are:
          </p>
          <ul
            className="mb-4 ml-6 list-disc"
          >
            <li>
              <strong>
                Events
              </strong>
              {' '}
              — Browse and RSVP for meetups, photo walks, and workshops.
            </li>
            <li>
              <strong>
                Challenges
              </strong>
              {' '}
              — Join themed photo challenges and submit your work.
            </li>
            <li>
              <strong>
                Gallery
              </strong>
              {' '}
              — Explore community photos and albums.
            </li>
            <li>
              <strong>
                Members
              </strong>
              {' '}
              — Discover other photographers and their profiles.
            </li>
            <li>
              <strong>
                Account
              </strong>
              {' '}
              — Manage your events, photos, albums, and settings (requires login).
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'search',
      title: 'Using the search feature',
      content: (
        <>
          <p
            className="mb-3"
          >
            Press
            {' '}
            <Kbd>
              Cmd+K
            </Kbd>
            {' '}
            (Mac) or
            {' '}
            <Kbd>
              Ctrl+K
            </Kbd>
            {' '}
            (Windows/Linux) to open the global search. Search across albums, photos, members, events, and tags. Use the arrow keys to navigate results and Enter to select. Press Esc to close.
          </p>
          <p>
            Search requires at least 2 characters. Results are grouped by type for easy browsing.
          </p>
        </>
      ),
    },
  ],
};
