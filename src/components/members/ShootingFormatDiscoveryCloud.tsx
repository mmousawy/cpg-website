'use client';

import { isShootingFormatSlug, type GearMemberGroup } from '@/lib/gear/groupMembersByGear';
import { membersShootingFormatPath } from '@/lib/gear/memberGearPaths';
import { SHOOTING_FORMAT_MICRO_ICONS } from '@/lib/gear/shootingFormatIcons';
import clsx from 'clsx';
import Link from 'next/link';

type ShootingFormatDiscoveryCloudProps = {
  groups: GearMemberGroup[];
  activeFormat?: string;
  className?: string;
};

export default function ShootingFormatDiscoveryCloud({
  groups,
  activeFormat,
  className,
}: ShootingFormatDiscoveryCloudProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div
      className={clsx('flex flex-wrap items-baseline gap-2', className)}
    >
      {groups.map((group) => {
        if (!isShootingFormatSlug(group.key)) return null;
        const format = group.key;
        const isActive = activeFormat === format;
        const count = group.members.length;
        const FormatIcon = SHOOTING_FORMAT_MICRO_ICONS[format];

        return (
          <Link
            key={group.key}
            href={membersShootingFormatPath(format)}
            aria-label={`${group.label}, ${count} ${count === 1 ? 'member' : 'members'}`}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
              'inline-flex items-center gap-1.5 border text-sm sm:text-base transition-colors rounded-full px-2 pt-0 pb-0.5 pr-1 shadow-sm',
              'transition-all translate-y-0 active:translate-y-0.5 active:inset-shadow-sm active:shadow-none',
              isActive
                ? 'bg-primary/80 text-white dark:bg-primary-dark border-primary'
                : 'bg-white hover:border-primary/50 dark:bg-white/15 text-foreground border-transparent',
            )}
          >
            <FormatIcon
              className="size-4 shrink-0"
              aria-hidden
            />
            {group.label}
            <span
              aria-hidden
              className={clsx(
                'font-medium ml-0.5 size-4 sm:size-5 inline-flex items-center justify-center rounded-full text-xs mt-px',
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
