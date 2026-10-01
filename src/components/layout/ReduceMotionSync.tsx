'use client';

import { useEffectiveMotionPreference } from '@/hooks/useDisplayPreferences';
import { useEffect } from 'react';

/** Applies the user's motion preference to the document root. */
export default function ReduceMotionSync() {
  const motion = useEffectiveMotionPreference();

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', motion === 'reduce');
    return () => {
      document.documentElement.classList.remove('reduce-motion');
    };
  }, [motion]);

  return null;
}
