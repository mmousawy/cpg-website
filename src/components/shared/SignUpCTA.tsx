'use client';

import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import { HERO_IMAGES } from '@/config/heroImages';
import { routes } from '@/config/routes';
import { useSession } from '@/hooks/useSession';
import clsx from 'clsx';
import Image from 'next/image';

const BANNER_BACKGROUND = HERO_IMAGES[0]?.src ?? '';

type SignUpCTAVariant = 'banner' | 'inline';

type SignUpCTAProps = {
  variant?: SignUpCTAVariant;
  className?: string;
};

export default function SignUpCTA({ variant = 'inline', className }: SignUpCTAProps) {
  const { user, isSessionReady } = useSession();

  if (!isSessionReady || user) {
    return null;
  }

  if (variant === 'banner') {
    return (
      <div
        className="relative overflow-hidden bg-background-light"
      >
        {BANNER_BACKGROUND && (
          <Image
            src={BANNER_BACKGROUND}
            alt=""
            fill
            aria-hidden
            className="object-cover object-[center_25%] brightness-75"
            sizes="100vw"
            loading="lazy"
            quality={60}
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-black/75 via-black/65 to-[#bba5fa]/25 backdrop-blur-xs"
        />
        <div
          className="relative z-10 inset-0 flex items-center px-4 pt-10 pb-11 md:px-8 sm:py-14"
        >
          <div
            className="w-full max-w-screen-md mx-auto space-y-4 text-shadow-xs"
          >
            <h2
              className="text-2xl font-bold text-white sm:text-3xl md:text-4xl font-heading"
            >
              Photography is better together
            </h2>
            <p
              className="text-base text-white/90 sm:text-lg max-w-[50ch]"
            >
              Join us for monthly meetups, themed photo challenges, and skill-sharing talks. Create a free account to RSVP for events, build your photo portfolio with albums, enter challenges to get featured, and discover work from other photographers in the community.
            </p>
            <div
              className="flex flex-wrap gap-3 pt-2"
            >
              <Button
                href={routes.signup.url}
                variant="secondary"
                size="md"
                className="border-white/80 bg-white/20! text-white hover:bg-white/30! hover:border-white hover:text-white"
              >
                Sign up for free
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Container
      className={clsx('bg-background-special border-special', className)}
    >
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p
          className="text-foreground/90"
        >
          Want to join the fun? Sign up to RSVP for events, share photos, and connect with the community.
        </p>
        <Button
          href={routes.signup.url}
          variant="primary"
          size="md"
          className="shrink-0"
        >
          Sign up for free
        </Button>
      </div>
    </Container>
  );
}

/** Wraps inline SignUpCTA in PageContainer; renders nothing when user is logged in (avoids empty space) */
export function SignUpCTASection() {
  const { user, isSessionReady } = useSession();

  if (!isSessionReady || user) {
    return null;
  }

  return (
    <PageContainer
      className="pt-8! pb-0! sm:pt-0! sm:pb-12!"
    >
      <SignUpCTA
        variant="inline"
      />
    </PageContainer>
  );
}
