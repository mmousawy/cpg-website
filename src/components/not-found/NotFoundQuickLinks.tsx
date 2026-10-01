import Link from 'next/link';

import { routes } from '@/config/routes';
import { getServerAuth } from '@/utils/supabase/getServerAuth';

type QuickLink = {
  href: string;
  label: string;
};

function QuickLinkItem({ href, label }: QuickLink) {
  return (
    <li
      className="w-[calc(50%-1.25rem)] sm:w-auto"
    >
      <Link
        href={href}
        prefetch={false}
        className="inline-block py-1 text-sm text-primary transition-colors hover:text-primary-alt"
      >
        {label}
      </Link>
    </li>
  );
}

export default async function NotFoundQuickLinks() {
  const { user, profile } = await getServerAuth();

  const shared: QuickLink[] = [
    { href: routes.events.url, label: routes.events.label },
    { href: routes.challenges.url, label: routes.challenges.label },
    { href: routes.gallery.url, label: routes.gallery.label },
    { href: routes.members.url, label: routes.members.label },
  ];

  const authSpecific: QuickLink[] = user
    ? [
        ...(profile?.nickname
          ? [{ href: `/@${profile.nickname}`, label: 'My profile' }]
          : []),
        { href: routes.accountPhotos.url, label: routes.accountPhotos.label },
        { href: routes.accountEvents.url, label: routes.accountEvents.label },
      ]
    : [
        { href: routes.login.url, label: routes.login.label },
        { href: routes.signup.url, label: routes.signup.label },
      ];

  const links = [...authSpecific, ...shared];

  return (
    <ul
      className="flex w-full max-w-xs flex-wrap justify-center gap-x-10 gap-y-4 sm:max-w-none sm:gap-x-5 sm:gap-y-2"
    >
      {links.map((link) => (
        <QuickLinkItem
          key={link.href}
          href={link.href}
          label={link.label}
        />
      ))}
    </ul>
  );
}
