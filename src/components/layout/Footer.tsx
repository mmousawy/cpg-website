import Link from 'next/link';

import FeedbackButton from '@/components/shared/FeedbackButton';
import { routes } from '@/config/routes';
import { socialLinks } from '@/config/socials';

// Import social icons - footer uses discord2 variant
import DiscordSVG from 'public/icons/discord2.svg';
import InstagramSVG from 'public/icons/instagram.svg';
import WhatsAppSVG from 'public/icons/whatsapp.svg';

// Map icons for footer (uses discord2 variant)
const iconMap: Record<string, typeof DiscordSVG> = {
  Discord: DiscordSVG,
  Instagram: InstagramSVG,
  WhatsApp: WhatsAppSVG,
};

export default function Footer() {
  const currentYear = process.env.NEXT_PUBLIC_COPYRIGHT_YEAR ?? '2026';
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <footer
      className="app-footer mt-auto flex justify-center border-t border-border-color bg-background-light px-2 py-4 sm:py-6 text-foreground"
    >
      <div
        className="flex w-full max-w-screen-md flex-col items-center gap-3"
      >
        <div
          className="flex items-center gap-4 max-md:justify-center"
        >
          {socialLinks.map(({ name, url }) => {
            const Icon = iconMap[name];
            return (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-border-color-strong bg-background px-4 py-1.5 text-sm font-medium font-(family-name:--font-geist-mono) text-foreground whitespace-nowrap transition-colors hover:border-primary hover:bg-[color-mix(in_srgb,var(--primary)_5%,var(--background))] focus-visible:border-primary focus-visible:bg-[color-mix(in_srgb,var(--primary)_5%,var(--background))] dark:bg-[#2e3032] dark:hover:bg-[color-mix(in_srgb,var(--primary)_8%,#2e3032)] dark:focus-visible:bg-[color-mix(in_srgb,var(--primary)_8%,#2e3032)] p-2! sm:px-3! sm:py-1!"
              >
                <span
                  className="inline-flex shrink-0 [&_svg:not([data-no-inherit])]:fill-current [&_svg[fill=none]]:fill-none [&_svg[stroke]]:stroke-current"
                >
                  <Icon
                    className="inline-block size-4"
                  />
                </span>
                <span
                  className="hidden sm:inline-block text-sm"
                >
                  {name}
                </span>
              </a>
            );
          })}
        </div>
        <div
          className="flex flex-wrap items-center justify-center gap-4 text-sm max-sm:flex-col max-sm:gap-2 py-2"
        >
          <Link
            href={routes.terms.url}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            {routes.terms.label}
          </Link>
          <span
            className="opacity-25 max-sm:hidden"
          >
            •
          </span>
          <Link
            href={routes.privacy.url}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            {routes.privacy.label}
          </Link>
          <span
            className="opacity-25 max-sm:hidden"
          >
            •
          </span>
          <Link
            href={routes.contact.url}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            {routes.contact.label}
          </Link>
          <span
            className="opacity-25 max-sm:hidden"
          >
            •
          </span>
          <Link
            href={routes.help.url}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            {routes.help.label}
          </Link>
          <span
            className="opacity-25 max-sm:hidden"
          >
            •
          </span>
          <FeedbackButton
            variant="link"
            className="text-sm"
          />
          {appVersion && (
            <>
              <span
                className="opacity-25 max-sm:hidden"
              >
                •
              </span>
              <Link
                href={routes.changelog.url}
                className="opacity-50 hover:opacity-100 transition-opacity text-xs"
              >
                v
                {appVersion}
              </Link>
            </>
          )}
        </div>
        <p
          className="text-sm opacity-60"
        >
          &copy;
          {currentYear}
          {' '}
          Creative Photography Group
        </p>
      </div>
    </footer>
  );
}
