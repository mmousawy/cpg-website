'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

import ThemeSwitch from '@/components/layout/ThemeSwitch';
import DevWorkbenchHeader from '@/dev/workbench/DevWorkbenchHeader';
import DevWorkbenchShell from '@/dev/workbench/DevWorkbenchShell';
import DevWorkbenchSidebar from '@/dev/workbench/DevWorkbenchSidebar';

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

function StoryboardSidebarFallback() {
  return (
    <DevWorkbenchSidebar
      ariaLabel="Components"
    >
      {null}
    </DevWorkbenchSidebar>
  );
}

/** `usePathname()` in this tree blocks prerender unless it stays under `<Suspense>`. */
function StoryboardSidebarRoute() {
  const pathname = usePathname();
  const route = parseStoryboardRoute(pathname);

  return (
    <StoryboardSidebar
      groups={groups}
      activeGroupId={route?.groupId ?? ''}
      activeSlug={route?.slug ?? ''}
    />
  );
}

export default function StoryboardAppLayout({ children }: StoryboardAppLayoutProps) {
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
        <Suspense
          fallback={<StoryboardSidebarFallback />}
        >
          <StoryboardSidebarRoute />
        </Suspense>
      )}
    >
      {children}
    </DevWorkbenchShell>
  );
}
