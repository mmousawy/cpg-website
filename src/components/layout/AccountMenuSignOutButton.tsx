'use client';

import { signOutAction } from '@/app/actions/auth';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';

type AccountMenuSignOutButtonProps = {
  onClose: () => void;
  className?: string;
};

export default function AccountMenuSignOutButton({
  onClose,
  className = 'flex w-full items-center rounded-lg px-3 py-2 text-left text-base text-red-500 hover:bg-red-500/10 sm:text-sm',
}: AccountMenuSignOutButtonProps) {
  const { signOut } = useAuth();
  const pathname = usePathname();
  const confirm = useConfirm();

  return (
    <form
      action={signOutAction}
      onSubmit={async (e) => {
        e.preventDefault();
        onClose();

        const confirmSignOut = await confirm({
          title: 'Sign out?',
          message: 'Are you sure you want to sign out?',
          confirmLabel: 'Sign out',
          cancelLabel: 'Stay signed in',
          variant: 'danger',
          confirmIcon: false,
        });
        if (!confirmSignOut) return;

        try {
          await signOut();
          const isProtectedRoute = pathname.startsWith('/account') || pathname.startsWith('/admin');
          if (isProtectedRoute) {
            window.location.href = '/';
          }
        } catch (error) {
          console.error('Error signing out:', error);
        }
      }}
    >
      <input type="hidden" name="redirectTo" value={pathname} />
      <button type="submit" className={className}>
        <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        Sign out
      </button>
    </form>
  );
}
