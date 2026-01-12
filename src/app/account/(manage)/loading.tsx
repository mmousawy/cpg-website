'use client';

import clsx from 'clsx';

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={clsx('animate-pulse bg-foreground/10', className)}
      style={style}
    />
  );
}

export default function ManageLoading() {
  return (
    <div className="flex h-[calc(100svh-61px)] md:h-[calc(100svh-81px)] w-full select-none">
      {/* Left Panel - Content */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-border-color">
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
              <Skeleton className="h-[38px] w-[80px] rounded-full" />
              <Skeleton className="h-[38px] w-[100px] rounded-full" />
            </div>
          </div>
        </div>

        {/* Grid skeleton - matches SelectableGrid styles */}
        <div className="flex-1 overflow-hidden p-3 md:p-6">
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(144px,1fr))] content-start">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton
                key={i}
                className="aspect-square bg-background-light"
                style={{
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Sidebar skeleton (hidden on mobile) */}
      <div className="hidden md:flex h-[calc(100vh-81px)] w-[400px] shrink-0 flex-col items-center justify-center bg-background-light p-10 text-center">
        <Skeleton className="mb-2 size-10 rounded" />
        <Skeleton className="mb-2 h-6 w-48 rounded" />
        <Skeleton className="h-4 w-56 rounded" />
      </div>
    </div>
  );
}
