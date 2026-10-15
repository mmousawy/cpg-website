'use client';

import type { GearMemberGroup } from '@/lib/gear/groupMembersByGear';
import {
  membersDailyDriverCameraPath,
  membersDailyDriverLensPath,
} from '@/lib/gear/memberGearPaths';
import clsx from 'clsx';
import Link from 'next/link';

type DailyDriverKind = 'camera' | 'lens';

function hrefForDailyDriver(kind: DailyDriverKind, label: string): string {
  return kind === 'camera'
    ? membersDailyDriverCameraPath(label)
    : membersDailyDriverLensPath(label);
}

type DailyDriverDiscoveryCloudProps = {
  groups: GearMemberGroup[];
  kind: DailyDriverKind;
  activeLabel?: string;
  className?: string;
};

export default function DailyDriverDiscoveryCloud({
  groups,
  kind,
  activeLabel,
  className,
}: DailyDriverDiscoveryCloudProps) {
  if (groups.length === 0) {
    return null;
  }

  const activeKey = activeLabel?.trim().toLowerCase();

  return (
    <div
      className={clsx('flex flex-wrap items-baseline gap-2', className)}
    >
      {groups.map((group) => {
        const isActive = activeKey === group.label.toLowerCase();
        const count = group.members.length;

        return (
          <Link
            key={group.key}
            href={hrefForDailyDriver(kind, group.label)}
            aria-label={`${group.label}, ${count} ${count === 1 ? 'member' : 'members'}`}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
              'inline-flex items-center border text-sm sm:text-base transition-colors rounded-full px-2 pt-0 pb-0.5 pr-1 shadow-sm max-w-full',
              'transition-all translate-y-0 active:translate-y-0.5 active:inset-shadow-sm active:shadow-none',
              isActive
                ? 'bg-primary/80 text-white dark:bg-primary-dark border-primary'
                : 'bg-white hover:border-primary/50 dark:bg-white/15 text-foreground border-transparent',
            )}
          >
            <span
              className="truncate"
            >
              {group.label}
            </span>
            <span
              aria-hidden
              className={clsx(
                'font-medium ml-1.5 shrink-0 size-4 sm:size-5 inline-flex items-center justify-center rounded-full text-xs mt-px',
                'inset-shadow-[0_1px_1px_0px_rgba(0,0,0,0.15)]',
                isActive
                  ? 'bg-black/30 dark:bg-black/50 text-white border-primary'
                  : 'bg-black/10 dark:bg-background/50 dark:text-white',
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
