import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { isStoryboardDev } from '@/dev/ui/isStoryboardDev';
import { getDefaultStoryboardPath } from '@/dev/ui/subcategories';

export const metadata: Metadata = {
  title: 'Component storyboard',
  robots: { index: false, follow: false },
};

export default function DevUiStoryboardPage() {
  if (!isStoryboardDev()) {
    notFound();
  }

  redirect(getDefaultStoryboardPath());
}
