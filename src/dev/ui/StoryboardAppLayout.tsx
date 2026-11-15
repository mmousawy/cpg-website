'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import ThemeSwitch from '@/components/layout/ThemeSwitch';
import DevWorkbenchHeader from '@/dev/workbench/DevWorkbenchHeader';
import DevWorkbenchShell from '@/dev/workbench/DevWorkbenchShell';

import { getUiComponentGroups } from './registry';
import StoryboardSidebar from './StoryboardSidebar';
import { countStoriesInRegistry } from './storyFrames';

const groups = getUiComponentGroups();

type StoryboardAppLayoutProps = {
  children: ReactNode;
};

function parseStoryboardRoute(pathname: string): { groupId: string; slug: string } | null {
  const match = /^\/dev\/ui\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  return { groupId: match[1], slug: match[2] };
}

export default function StoryboardAppLayout({ children }: StoryboardAppLayoutProps) {
  const pathname = usePathname();
  const route = parseStoryboardRoute(pathname);
  const storyCount = countStoriesInRegistry();

  return (
    <DevWorkbenchShell
      header={(
        <DevWorkbenchHeader
          title="Component storyboard"
          subtitle={(
            <>
              Development only ·
              {' '}
              {storyCount}
              {' '}
              story variants ·
              {' '}
              <Link
                href="/email"
                className="text-primary hover:underline"
              >
                Email previews
              </Link>
            </>
          )}
          trailing={<ThemeSwitch />}
        />
      )}
      sidebar={(
        <StoryboardSidebar
          groups={groups}
          activeGroupId={route?.groupId ?? ''}
          activeSlug={route?.slug ?? ''}
        />
      )}
    >
      {children}
    </DevWorkbenchShell>
  );
}
