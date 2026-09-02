'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { useRef } from 'react';

import { MANAGE_PAGE_BOOT_SCRIPT } from '@/utils/managePage';
import { PLATFORM_BOOT_SCRIPT } from '@/utils/platform';

/**
 * Injects blocking boot scripts into the SSR document head, outside the
 * hydrated React tree. A raw <script> in layout.tsx triggers React 19's
 * client warning and is never executed on the client.
 */
export default function DocumentBootScripts() {
  const inserted = useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) {
      return null;
    }
    inserted.current = true;
    return (
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `${MANAGE_PAGE_BOOT_SCRIPT}${PLATFORM_BOOT_SCRIPT}`,
        }}
      />
    );
  });

  return null;
}
