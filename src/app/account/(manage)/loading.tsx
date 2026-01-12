'use client';

import clsx from 'clsx';

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx('animate-pulse rounded bg-foreground/10', className)}
    />
  );
}

export default function ManageLoading() {
  return (
    <div className="flex h-[calc(100svh-61px)] md:h-[calc(100svh-81px)] w-full select-none">
      {/* Left Panel - Content */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-border-color md:border-r">
        {/* Header skeleton */}
        <div className="sticky top-0 z-20 border-b border-border-color bg-background-light px-2 py-2">
          <div className="flex items-center justify-between gap-4">
            {/* Tab navigation skeleton */}
            <div className="flex">
              <Skeleton className="h-[38px] w-[90px] rounded-tl-full rounded-bl-full" />
              <Skeleton className="-ml-[2px] h-[38px] w-[90px] rounded-tr-full rounded-br-full" />
            </div>
            {/* Action buttons skeleton */}
            <div className="flex gap-2">
              <Skeleton className="h-[38px] w-[100px] rounded-lg" />
            </div>
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton
                key={i}
                className="aspect-square rounded-lg"
                style={{
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Sidebar skeleton (hidden on mobile) */}
      <div className="hidden md:flex h-[calc(100vh-81px)] w-[400px] shrink-0 flex-col bg-background-light p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}
