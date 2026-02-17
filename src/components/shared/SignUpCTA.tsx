'use client';

import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import BlurImage from '@/components/shared/BlurImage';
import Button from '@/components/shared/Button';
import { routes } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';

const BANNER_BACKGROUND =
  'https://db.creativephotography.group/storage/v1/object/public/cpg-public/hero/home-hero1.jpg';

type SignUpCTAVariant = 'banner' | 'inline';

type SignUpCTAProps = {
  variant?: SignUpCTAVariant;
};

export default function SignUpCTA({ variant = 'inline' }: SignUpCTAProps) {
  const { user, isLoading } = useAuth();

  if (isLoading || user) {
    return null;
  }

  if (variant === 'banner') {
    return (
      <div
        className="relative overflow-hidden bg-background-light mb-6 sm:mb-14"
      >
        <BlurImage
          src={BANNER_BACKGROUND}
          alt=""
          fill
          className="object-cover object-[center_25%] brightness-75"
          sizes="100vw"
          quality={85}
        />
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-xs"
        />
        <div
          className="relative z-10 inset-0 flex items-center px-4 pt-10 pb-11 md:px-8 sm:py-14"
        >
          <div
            className="w-full max-w-screen-md mx-auto space-y-4"
          >
            <h2
              className="text-2xl font-bold text-white sm:text-3xl md:text-4xl"
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
    <Container>
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
  const { user, isLoading } = useAuth();

  if (isLoading || user) {
    return null;
  }

  return (
    <PageContainer
      className="pt-4!"
    >
      <SignUpCTA
        variant="inline"
      />
    </PageContainer>
  );
}
