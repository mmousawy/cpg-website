'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import Button from '@/components/shared/Button';
import { routes } from '@/config/routes';
import { usePathname } from 'next/navigation';
import { useCallback, useContext } from 'react';

interface AuthPromptOptions {
  /** The feature that requires authentication (e.g., "like photos", "leave comments") */
  feature: string;
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
}

/**
 * Hook to show an authentication prompt modal for features that require login.
 * Uses the global modal system for consistent UI.
 *
 * @example
 * const showAuthPrompt = useAuthPrompt();
 * // When user tries to use a feature without being logged in:
 * showAuthPrompt({ feature: 'like photos' });
 */
export function useAuthPrompt() {
  const { setIsOpen, setTitle, setContent, setFooter, setSize } = useContext(ModalContext);
  const pathname = usePathname();

  const showAuthPrompt = useCallback(
    ({ feature, title, description }: AuthPromptOptions) => {
      const redirectTo = encodeURIComponent(pathname);

      setSize('small');
      setTitle(title || 'Join our community');
      setContent(
        <div
          className="text-center"
        >
          <div
            className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10"
          >
            <svg
              className="size-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p
            className="text-foreground/70"
          >
            {description || `Sign in to ${feature} and connect with our photography community.`}
          </p>
        </div>,
      );
      setFooter(
        <div
          className="flex flex-wrap justify-center gap-3"
        >
          <Button
            href={`${routes.login.url}?redirectTo=${redirectTo}`}
            onClick={() => setIsOpen(false)}
          >
            Log in
          </Button>
          <Button
            href={`${routes.signup.url}?redirectTo=${redirectTo}`}
            variant="secondary"
            onClick={() => setIsOpen(false)}
          >
            Sign up
          </Button>
        </div>,
      );
      setIsOpen(true);
    },
    [pathname, setIsOpen, setTitle, setContent, setFooter, setSize],
  );

  return showAuthPrompt;
}
