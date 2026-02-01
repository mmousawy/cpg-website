'use client';

import clsx from 'clsx';
import Link from 'next/link';

import PageContainer from '@/components/layout/PageContainer';

import CalendarSVG from 'public/icons/calendar2.svg';

type AdminCard = {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  enabled: boolean
}

export default function AdminDashboardPage() {
  // Admin access is guaranteed by ProtectedRoute layout with requireAdmin

  const adminCards: AdminCard[] = [
    {
      title: 'Manage events',
      description: 'Create, edit, and manage events',
      icon: <CalendarSVG
        className="h-8 w-8 fill-current"
      />,
      href: '/admin/events',
      enabled: true,
    },
    {
      title: 'Manage Members',
      description: 'View and manage community members',
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      href: '/admin/members',
      enabled: true,
    },
    {
      title: 'View statistics',
      description: 'Analytics and attendance reports',
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      href: '#',
      enabled: false,
    },
    {
      title: 'Tools',
      description: 'Admin utilities and settings',
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      href: '/admin/tools',
      enabled: true,
    },
  ];

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <h1
          className="text-3xl font-bold"
        >
          Admin Dashboard
        </h1>
      </div>

      <div
        className="grid gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {adminCards.map((card) => {
          const cardContent = (
            <>
              <div
                className={clsx(
                  'mb-4 inline-flex rounded-lg p-2 sm:p-3',
                  card.enabled ? 'bg-primary/10 text-primary' : 'bg-foreground/10 text-foreground/50',
                )}
              >
                {card.icon}
              </div>
              <h3
                className="mb-2 text-lg font-semibold"
              >
                {card.title}
              </h3>
              <p
                className="text-sm text-foreground/70"
              >
                {card.description}
              </p>
              {!card.enabled && (
                <p
                  className="mt-3 text-xs font-medium text-foreground/50"
                >
                  Coming soon
                </p>
              )}
            </>
          );

          const cardClassName = clsx(
            'rounded-lg border border-border-color bg-background-light p-6 transition-all',
            card.enabled
              ? 'cursor-pointer hover:border-primary hover:shadow-lg'
              : 'cursor-not-allowed opacity-50',
          );

          return card.enabled ? (
            <Link
              key={card.title}
              href={card.href}
              className={cardClassName}
            >
              {cardContent}
            </Link>
          ) : (
            <div
              key={card.title}
              className={cardClassName}
            >
              {cardContent}
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
