'use client';

import { HomeBelowFoldContent } from '@/components/home/HomeBelowFoldContent';
import { HomeBelowFoldSkeleton } from '@/components/home/HomeBelowFoldSkeleton';
import type { HomePageData } from '@/lib/data/home';
import { afterFirstPaint } from '@/utils/afterFirstPaint';
import { useEffect, useState } from 'react';

export default function HomeBelowFoldClient() {
  const [data, setData] = useState<HomePageData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    afterFirstPaint(() => {
      void fetch('/api/home/below-fold', { credentials: 'same-origin' })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.json() as Promise<HomePageData>;
        })
        .then((json) => {
          if (!cancelled) setData(json);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <HomeBelowFoldSkeleton />
    );
  }

  if (!data) {
    return (
      <HomeBelowFoldSkeleton />
    );
  }

  return (
    <HomeBelowFoldContent
      {...data}
    />
  );
}
