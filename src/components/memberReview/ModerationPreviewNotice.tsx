'use client';

import { useSearchParams } from 'next/navigation';

import { parsePreviewFlagQuery } from '@/lib/memberReview/blockPreview';

export default function ModerationPreviewNotice({ queryParam }: { queryParam: string }) {
  const searchParams = useSearchParams();
  if (parsePreviewFlagQuery(searchParams.get(queryParam)) !== 'enable') {
    return null;
  }

  return (
    <p
      className="text-foreground/60 text-xs sm:text-sm"
    >
      Preview on. Add
      {' '}
      <code>?{queryParam}=false</code>
      {' '}
      to any URL to leave.
    </p>
  );
}
