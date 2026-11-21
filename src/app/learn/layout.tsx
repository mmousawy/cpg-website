import type { ReactNode } from 'react';

import LearnPageBootScript from '@/components/learn/LearnPageBootScript';
import LearnShell from '@/components/learn/LearnShell';

export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
    >
      <LearnPageBootScript />
      <LearnShell>
        {children}
      </LearnShell>
    </div>
  );
}
