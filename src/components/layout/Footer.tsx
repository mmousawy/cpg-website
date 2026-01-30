'use client';

import Link from 'next/link';

import Button from '@/components/shared/Button';
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
  // Client component - safe to use new Date() directly
  const currentYear = new Date().getFullYear();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <footer
      className="mt-auto flex justify-center border-t-[0.0625rem] border-border-color bg-background-light px-2 py-4 sm:py-6 text-foreground"
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
              <Button
                key={name}
                href={url}
                variant="secondary"
                icon={<Icon
                  className="inline-block size-4"
                />}
                className="p-2! sm:px-3! sm:py-1!"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
              >
                <span
                  className="hidden sm:inline-block text-sm"
                >
                  {name}
                </span>
              </Button>
            );
          })}
        </div>
        <div
          className="flex flex-wrap items-center justify-center gap-4 text-sm max-sm:flex-col max-sm:gap-2"
        >
          <p
            className="opacity-70"
          >
            &copy;
            {currentYear}
            {' '}
            Creative Photography Group
          </p>
          <span
            className="opacity-25 max-sm:hidden"
          >
            •
          </span>
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
      </div>
    </footer>
  );
}
