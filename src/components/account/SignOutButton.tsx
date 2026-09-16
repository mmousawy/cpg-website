'use client';

import { signOutAction } from '@/app/actions/auth';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';

export default function SignOutButton() {
  const { signOut } = useAuth();
  const pathname = usePathname();
  const confirm = useConfirm();

  return (
    <form
      action={signOutAction}
      onSubmit={async (e) => {
        e.preventDefault();

        const confirmSignOut = await confirm({
          title: 'Sign out?',
          message: 'Are you sure you want to sign out?',
          confirmLabel: 'Sign out',
          cancelLabel: 'Stay signed in',
          variant: 'danger',
        });
        if (!confirmSignOut) return;

        try {
          await signOut();
          window.location.href = '/';
        } catch (error) {
          console.error('Error signing out:', error);
        }
      }}
    >
      <input type="hidden" name="redirectTo" value={pathname} />
      <Button type="submit" variant="secondary">
        Sign out
      </Button>
    </form>
  );
}
