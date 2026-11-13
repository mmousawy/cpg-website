'use client';

import { signOutAction } from '@/app/actions/auth';
import Button from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function UnderReviewSignOut() {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <form
      action={signOutAction}
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await signOut();
          router.push('/login');
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
