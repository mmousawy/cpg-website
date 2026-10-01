import { Suspense } from 'react';

import PageContainer from '@/components/layout/PageContainer';
import NotFoundQuickLinks from '@/components/not-found/NotFoundQuickLinks';
import NotFoundQuickLinksFallback from '@/components/not-found/NotFoundQuickLinksFallback';
import BlurImage from '@/components/shared/BlurImage';
import Button from '@/components/shared/Button';
import { routes } from '@/config/routes';
import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Page not found',
  description: 'The page you are looking for could not be found',
});

export default function Custom404() {
  return (
    <PageContainer
      className="grow"
      innerClassName="flex flex-col max-w-md"
    >
      <div
        className="flex grow flex-col items-center justify-center py-8 text-center sm:justify-start sm:py-10"
      >
        <BlurImage
          src="/404-illustration.webp"
          alt=""
          width={1463}
          height={771}
          className="h-auto w-full sm:max-w-xs"
          sizes="(max-width: 639px) calc(100vw - 1.5rem), 20rem"
          quality={80}
          noBlur
          preload
          fetchPriority="high"
          loading="eager"
        />
        <h1
          className="mt-8 text-balance text-2xl font-bold font-heading sm:text-3xl"
        >
          Page not found.
        </h1>
        <p
          className="mt-4 max-w-sm text-balance text-base leading-relaxed text-foreground/80 sm:text-lg"
        >
          The link may be outdated, or this page may have moved.
        </p>
        <div
          className="mt-10"
        >
          <Button
            href={routes.home.url}
            prefetch={false}
          >
            Go to homepage
          </Button>
        </div>
        <div
          className="mt-12"
        >
          <p
            className="mb-4 text-sm text-foreground/60"
          >
            You might be looking for
          </p>
          <Suspense
            fallback={<NotFoundQuickLinksFallback />}
          >
            <NotFoundQuickLinks />
          </Suspense>
        </div>
      </div>
    </PageContainer>
  );
}
