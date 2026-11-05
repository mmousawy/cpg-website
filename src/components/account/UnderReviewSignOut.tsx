'use client';

import { signOutAction } from '@/app/actions/auth';
import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';

export default function UnderReviewSignOut() {
  const { signOut } = useAuth();

  return (
    <form
      action={signOutAction}
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await signOut();
          window.location.href = '/login';
        } catch (error) {
          console.error('Error signing out:', error);
        }
      }}
    >
      <Button
        type="submit"
        variant="secondary"
      >
        Sign out
      </Button>
    </form>
  );
}
