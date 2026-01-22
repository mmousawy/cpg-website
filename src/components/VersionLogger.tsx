'use client';

import { useEffect } from 'react';

export default function VersionLogger() {
  useEffect(() => {
    const version = process.env.NEXT_PUBLIC_APP_VERSION;
    if (version) {
      console.log('%cCreative Photography Group', 'font-weight: bold; font-size: 14px; color: #3b82f6;');
      console.log(`%cVersion: ${version}`, 'font-size: 12px; color: #6b7280;');
    }
  }, []);

  return null;
}
