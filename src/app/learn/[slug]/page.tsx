import { notFound } from 'next/navigation';

import LearnPresenter from '@/components/learn/LearnPresenter';
import { getLearnLessonBySlug, getLearnLessonSlugs } from '@/content/learn';
import { ensureStaticParams } from '@/lib/staticParams';
import { createMetadata } from '@/utils/metadata';

type LearnLessonPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return ensureStaticParams(
    getLearnLessonSlugs().map((slug) => ({ slug })),
    { slug: '__build_placeholder__' },
  );
}

export async function generateMetadata({ params }: LearnLessonPageProps) {
  const { slug } = await params;
  if (slug === '__build_placeholder__') {
    return createMetadata({
      title: 'Learn',
      description: 'Photography lessons from Creative Photography Group.',
      canonical: '/learn',
      noindex: true,
      nofollow: true,
    });
  }

  const lesson = getLearnLessonBySlug(slug);
  if (!lesson) {
    return createMetadata({
      title: 'Lesson not found',
      canonical: '/learn',
    });
  }

  return createMetadata({
    title: lesson.title,
    description: lesson.summary,
    canonical: `/learn/${lesson.slug}`,
  });
}

export default async function LearnLessonPage({ params }: LearnLessonPageProps) {
  const { slug } = await params;
  if (slug === '__build_placeholder__') {
    notFound();
  }

  const lesson = getLearnLessonBySlug(slug);
  if (!lesson) {
    notFound();
  }

  return (
    <LearnPresenter
      lesson={lesson}
    />
  );
}
