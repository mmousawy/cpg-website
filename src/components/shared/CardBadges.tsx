'use client';

import clsx from 'clsx';
import { ReactNode } from 'react';
import Tooltip from './Tooltip';

export type BadgeVariant = 'private' | 'album-cover' | 'in-album' | 'rejected' | 'pending' | 'accepted' | 'challenge';

export interface BadgeConfig {
  icon?: ReactNode;
  label?: string;
  className?: string;
  variant?: BadgeVariant;
  /** Tooltip content to show on hover */
  tooltip?: ReactNode;
}

interface CardBadgesProps {
  badges: BadgeConfig[];
  /** Position of badges - defaults to 'top-right' */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export default function CardBadges({ badges, position = 'top-right' }: CardBadgesProps) {
  if (badges.length === 0) return null;

  const positionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2',
  };

  const flexDirection = position === 'bottom-right' || position === 'bottom-left' ? 'flex-col-reverse' : 'flex-col';
  const alignItems = position === 'top-right' || position === 'bottom-right' ? 'items-end' : 'items-start';

  const getBadgeClasses = (variant?: BadgeVariant) => {
    const baseClasses = 'inline-block rounded-full px-1 py-1 text-xs';

    switch (variant) {
      case 'album-cover':
        return clsx(
          baseClasses,
          'border border-green-800 bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-200',
        );
      case 'in-album':
        return clsx(
          baseClasses,
          'border border-blue-800 bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200',
        );
      case 'rejected':
        return clsx(
          baseClasses,
          'border border-red-800 bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-200',
        );
      case 'pending':
        return clsx(
          baseClasses,
          'border border-orange-800 bg-orange-100 text-orange-800 dark:bg-orange-900/80 dark:text-orange-200',
        );
      case 'accepted':
        return clsx(
          baseClasses,
          'border border-green-800 bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-200',
        );
      case 'challenge':
        return clsx(
          baseClasses,
          'border border-purple-800 bg-purple-100 text-purple-800 dark:bg-purple-900/80 dark:text-purple-200',
        );
      case 'private':
      default:
        return clsx(
          baseClasses,
          'border border-yellow-800 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-200',
        );
    }
  };

  return (
    <div
      className={clsx('absolute z-10', positionClasses[position], 'flex', flexDirection, 'gap-1.5', alignItems)}
    >
      {badges.map((badge, index) => {
        const badgeElement = (
          <span
            key={index}
            className={clsx(getBadgeClasses(badge.variant), badge.className)}
          >
            {badge.icon || badge.label}
          </span>
        );

        return badge.tooltip ? (
          <Tooltip
            key={index}
            content={badge.tooltip}
            position="top"
          >
            {badgeElement}
          </Tooltip>
        ) : (
          badgeElement
        );
      })}
    </div>
  );
}
