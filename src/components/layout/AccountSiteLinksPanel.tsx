'use client';

import clsx from 'clsx';
import Link from 'next/link';

import FeedbackButton from '@/components/shared/FeedbackButton';
import { routes } from '@/config/routes';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import AccountMenuChevron from './AccountMenuChevron';
import AccountMenuSignOutButton from './AccountMenuSignOutButton';

type AccountSiteLinksPanelProps = {
  onBack: () => void;
  onClose: () => void;
  menuLinkClass: (href: string, exact?: boolean) => string;
};

function AccountMenuDivider() {
  return <div className="border-t border-border-color-strong mx-4" role="presentation" />;
}

function ThemeToggleButton() {
  const { user, updateProfileTheme } = useAuth();
  const { resolvedTheme, setTheme } = useAppTheme();
  const mounted = useMounted();

  const handleThemeToggle = async () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);

    if (!user) return;

    const { error } = await updateProfileTheme(newTheme);
    if (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleThemeToggle}
      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-base hover:bg-background sm:text-sm"
    >
      <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {mounted && resolvedTheme === 'dark' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        )}
      </svg>
      {mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    </button>
  );
}

export default function AccountSiteLinksPanel({
  onBack,
  onClose,
  menuLinkClass,
}: AccountSiteLinksPanelProps) {
  const { user } = useAuth();
  const externalLinkClass =
    'flex w-full items-center rounded-lg px-3 py-2 text-left text-base hover:bg-background sm:text-sm';

  return (
    <>
      <div className="p-2">
        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-base hover:bg-background sm:text-sm"
        >
          <AccountMenuChevron direction="left" className="mr-3 h-4 w-4 shrink-0 opacity-50" />
          Help & info
        </button>
      </div>

      <AccountMenuDivider />

      <div className="p-2">
        {user && (
          <Link
            href={routes.accountStats.url}
            prefetch={false}
            onClick={onClose}
            className={menuLinkClass(routes.accountStats.url)}
          >
            <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {routes.accountStats.label}
          </Link>
        )}
        <ThemeToggleButton />
      </div>

      <AccountMenuDivider />

      <div className="p-2">
        <Link
          href={routes.help.url}
          prefetch={false}
          onClick={onClose}
          className={menuLinkClass(routes.help.url)}
        >
          {routes.help.label}
        </Link>
        <Link
          href={routes.contact.url}
          prefetch={false}
          onClick={onClose}
          className={menuLinkClass(routes.contact.url)}
        >
          {routes.contact.label}
        </Link>
        <FeedbackButton
          variant="menuItem"
          onOpen={onClose}
          className={clsx(externalLinkClass, 'w-full')}
        />
        <Link
          href={routes.changelog.url}
          prefetch={false}
          onClick={onClose}
          className={menuLinkClass(routes.changelog.url)}
        >
          {routes.changelog.label}
        </Link>
      </div>

      <AccountMenuDivider />

      <div className="p-2">
        <Link
          href={routes.terms.url}
          prefetch={false}
          onClick={onClose}
          className={menuLinkClass(routes.terms.url)}
        >
          {routes.terms.label}
        </Link>
        <Link
          href={routes.privacy.url}
          prefetch={false}
          onClick={onClose}
          className={menuLinkClass(routes.privacy.url)}
        >
          {routes.privacy.label}
        </Link>
      </div>

      {user ? (
        <>
          <AccountMenuDivider />
          <div className="p-2">
            <AccountMenuSignOutButton onClose={onClose} />
          </div>
        </>
      ) : null}
    </>
  );
}
