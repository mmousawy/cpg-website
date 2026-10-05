'use client';

import { usePathname } from 'next/navigation';

/** Must stay inside `<Suspense>` — `usePathname()` is a blocking client hook. */
export default function NavActiveMarker({ href }: { href: string }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
  if (!isActive) return null;

  return (
    <span
      data-active=""
      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary"
      aria-hidden
    />
  );
}
