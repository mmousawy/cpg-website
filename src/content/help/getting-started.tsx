import AlternateEmailSVG from 'public/icons/alternate-email.svg';
import GavelSVG from 'public/icons/gavel.svg';
import ImageSVG from 'public/icons/image.svg';
import MailSVG from 'public/icons/mail.svg';
import PaletteSVG from 'public/icons/palette.svg';
import PersonSVG from 'public/icons/person.svg';
import type { ComponentType, ReactNode, SVGProps } from 'react';

import type { FAQSection } from './types';

const Kbd = ({ children }: { children: string }) => (
  <kbd
    className="rounded border border-foreground/20 bg-muted px-1.5 py-0.5 font-mono text-xs"
  >
    {children}
  </kbd>
);

function HelpStep({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon
        className="mt-0.5 size-5 shrink-0"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="mb-0.5 font-medium text-foreground">
          {title}
        </p>
        <div className="space-y-1.5">
          {children}
        </div>
      </div>
    </div>
  );
}

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
          <ul>
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
            After signing up, you finish a short profile setup before the rest of the site opens up.
          </p>
        </>
      ),
    },
    {
      id: 'setup-profile',
      title: 'Setting up your profile',
      content: (
        <>
          <p className="mb-4">
            A few screens, then you&apos;re in. Skip anything marked optional — you can fill it in later from Account.
          </p>
          <div className="space-y-4">
            <HelpStep icon={AlternateEmailSVG} title="Your nickname">
              <p>
                This is the unique handle in your profile URL, like @janedoe. Lowercase letters, numbers, and hyphens; 3–30 characters. You can change it later from Account, with an email confirm, once every 60 days.
              </p>
            </HelpStep>
            <HelpStep icon={PersonSVG} title="About you">
              <p>
                Screen name is what people see on your profile (at least 2 characters)—it doesn&apos;t have to be your real name. Bio and interests are optional. Interests (up to 10) help others find you.
              </p>
            </HelpStep>
            <HelpStep icon={PaletteSVG} title="Theme">
              <p>
                Color scheme: Auto follows your device; Light, Dark, and Midnight stay put. Album cards can be Large (details under the photo) or Compact. Both live in Account if you change your mind.
              </p>
            </HelpStep>
            <HelpStep icon={ImageSVG} title="Profile images">
              <p>
                A profile picture and a banner, if you have them. You can skip this and add them later.
              </p>
            </HelpStep>
            <HelpStep icon={MailSVG} title="Email preferences">
              <p>
                Tick the kinds of email you actually want — events, comments, challenges, and so on. Unchecked stays off. You can flip these anytime in Account → Preferences.
              </p>
            </HelpStep>
            <HelpStep icon={GavelSVG} title="One last step">
              <p>
                Agree to the Terms and confirm you&apos;ve read the Privacy Policy. You keep copyright on your photos. Then hit Join the group.
              </p>
            </HelpStep>
          </div>
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
          <ul>
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
