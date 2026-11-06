import { Suspense } from 'react';
import LogoSVG from 'public/cpg-logo.svg';

import ModerationPreviewNotice from '@/components/memberReview/ModerationPreviewNotice';
import { BLOCK_PREVIEW_QUERY_PARAM } from '@/lib/memberReview/blockPreview';

const APPEAL_EMAIL = 'murtada.al.mousawy@gmail.com';

export default function NetworkBlockedPage() {
  return (
    <div
      className="network-blocked-screen flex flex-1 flex-col items-center justify-center px-4 py-12 text-center"
    >
      <LogoSVG
        className="mb-8 block size-20 shrink-0 sm:size-24"
        aria-hidden
      />
      <h1
        className="mb-4 text-2xl font-bold font-heading sm:text-3xl"
      >
        You have been blocked
      </h1>
      <div
        className="max-w-md space-y-4 text-foreground/90 text-sm sm:text-base"
      >
        <p>
          You have been blocked from Creative Photography Group by an administrator or an automated system.
        </p>
        <p>
          If you think this was a mistake, please email us at
          {' '}
          <a
            href={`mailto:${APPEAL_EMAIL}`}
            className="break-all text-primary underline underline-offset-2 hover:text-primary-alt text-nowrap"
          >
            {APPEAL_EMAIL}
          </a>
          {' '}
          and we&apos;ll take a look.
        </p>
        <Suspense
          fallback={null}
        >
          <ModerationPreviewNotice
            queryParam={BLOCK_PREVIEW_QUERY_PARAM}
          />
        </Suspense>
      </div>
    </div>
  );
}
