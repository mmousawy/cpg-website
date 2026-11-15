'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { emailTemplateSlugs } from '@/app/email/emailTemplates';
import ThemeSwitch from '@/components/layout/ThemeSwitch';
import DevWorkbenchHeader from '@/dev/workbench/DevWorkbenchHeader';
import DevWorkbenchShell from '@/dev/workbench/DevWorkbenchShell';

import EmailPreviewSidebar from './EmailPreviewSidebar';

type EmailPreviewAppLayoutProps = {
  children: ReactNode;
};

export default function EmailPreviewAppLayout({ children }: EmailPreviewAppLayoutProps) {
  const templateCount = emailTemplateSlugs.length;

  return (
    <DevWorkbenchShell
      header={(
        <DevWorkbenchHeader
          title="Email previews"
          subtitle={(
            <>
              Development only ·
              {' '}
              {templateCount}
              {' '}
              templates ·
              {' '}
              <Link
                href="/dev/ui"
                className="text-primary hover:underline"
              >
                Component storyboard
              </Link>
            </>
          )}
          trailing={<ThemeSwitch />}
        />
      )}
      sidebar={<EmailPreviewSidebar />}
    >
      {children}
    </DevWorkbenchShell>
  );
}
