'use client';

import clsx from 'clsx';
import Link from 'next/link';

import { routes } from '@/config/routes';
import { getLearnLessonBySlug } from '@/content/learn';
import { learnOutline } from '@/content/learn/outline';

type LearnOutlineSectionsProps = {
  activeSlug?: string | null;
  /** Compact sidebar vs overview in the main pane */
  variant?: 'sidebar' | 'overview';
  onNavigate?: () => void;
  /** Fires with the lesson slug as soon as a live topic is clicked (before navigation). */
  onTopicChosen?: (slug: string) => void;
};

export default function LearnOutlineSections({
  activeSlug = null,
  variant = 'sidebar',
  onNavigate,
  onTopicChosen,
}: LearnOutlineSectionsProps) {
  const isOverview = variant === 'overview';

  return (
    <div
      className={clsx('flex flex-col', isOverview ? 'gap-8 sm:gap-10' : 'gap-5')}
    >
      {learnOutline.map((section) => (
        <section
          key={section.title}
          className="flex flex-col gap-1.5"
        >
          <p
            className={clsx(
              'font-semibold uppercase tracking-wide text-foreground',
              isOverview ? 'text-sm sm:text-base' : 'px-2 text-xs',
            )}
          >
            {section.title}
          </p>
          <ul
            className={clsx(
              'flex flex-col',
              isOverview ? 'gap-2 sm:gap-3' : 'ml-2 gap-0.5 border-l border-border-color-strong pl-3',
            )}
          >
            {section.items.map((item) => {
              const isLive = Boolean(item.slug);
              const isActive = isLive && item.slug === activeSlug;
              const href = item.slug ? `${routes.learn.url}/${item.slug}` : undefined;
              const summary = item.slug ? getLearnLessonBySlug(item.slug)?.summary : undefined;

              if (href) {
                return (
                  <li
                    key={item.title}
                  >
                    <Link
                      href={href}
                      prefetch={false}
                      onClick={() => {
                        if (item.slug) {
                          onTopicChosen?.(item.slug);
                        }
                        onNavigate?.();
                      }}
                      className={clsx(
                        'block rounded-lg transition-colors',
                        isOverview ? 'border border-border-color bg-background-light px-4 py-3 hover:border-primary/40 hover:bg-background-medium' : 'py-1.5 pr-2 pl-1 text-sm',
                        !isOverview && (isActive
                          ? 'bg-primary/15 font-medium text-primary'
                          : 'text-foreground hover:bg-background-medium'),
                        isOverview && isActive && 'border-primary/50 bg-primary/10',
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span
                        className={clsx(
                          'font-medium text-foreground',
                          isOverview ? 'text-base sm:text-lg' : 'text-sm',
                          !isOverview && isActive && 'text-primary',
                        )}
                      >
                        {item.title}
                      </span>
                      {isOverview && summary ? (
                        <p
                          className="mt-1 text-sm leading-relaxed text-foreground/75"
                        >
                          {summary}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                );
              }

              return (
                <li
                  key={item.title}
                >
                  <span
                    className={clsx(
                      'flex items-center justify-between gap-2 rounded-lg text-foreground/45',
                      isOverview ? 'border border-dashed border-border-color px-4 py-3 text-base' : 'py-1.5 pr-2 pl-1 text-sm',
                    )}
                  >
                    <span>{item.title}</span>
                    <span
                      className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-foreground/40"
                    >
                      Soon
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
