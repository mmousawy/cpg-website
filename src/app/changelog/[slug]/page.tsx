import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import {
  getChangelogCommitSummary,
  getChangelogDetailMarkdown,
  getChangelogSlugs,
  getVersionForSlug,
} from '@/lib/changelog';
import { createMetadata } from '@/utils/metadata';
import { notFound } from 'next/navigation';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';

import ArrowLeftIcon from 'public/icons/arrow-left.svg';

interface ChangelogDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getChangelogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ChangelogDetailPageProps) {
  const { slug } = await params;
  const summary = await getChangelogCommitSummary(slug);
  const title = summary ?? `Changelog ${slug}`;
  return createMetadata({
    title: `Changelog: ${title}`,
    description: summary ?? `Detailed changes for ${slug}`,
    canonical: `/changelog/${slug}`,
  });
}

const markdownComponents: Components = {
  h1: () => null,
  h2: ({ children }) => (
    <h2
      className="mb-4 mt-4 scroll-mt-20 border-b border-border-color pb-2 text-xl font-semibold text-foreground sm:text-xl"
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      className="mb-3 mt-4 sm:mt-6 scroll-mt-20 text-lg font-semibold text-foreground sm:text-xl"
    >
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p
      className="mb-4 leading-relaxed text-foreground/90 text-sm sm:text-base"
    >
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul
      className="mb-6 ml-6 list-disc space-y-2 text-foreground/90 text-sm sm:text-base"
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol
      className="mb-6 ml-6 list-decimal space-y-2 text-foreground/90 text-sm sm:text-base"
    >
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li
      className="leading-relaxed text-sm sm:text-base"
    >
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong
      className="font-semibold text-foreground"
    >
      {children}
    </strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <div
      className="mb-6 overflow-hidden rounded-xl border border-border-color bg-background-medium"
    >
      <pre
        className="overflow-x-auto p-4 font-mono leading-relaxed sm:p-5 text-xs sm:text-sm"
      >
        {children}
      </pre>
    </div>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return <code
        className={className}
      >
        {children}
      </code>;
    }
    return (
      <code
        className="rounded border border-border-color bg-background-light px-1.5 py-0.5 font-mono text-sm text-foreground"
      >
        {children}
      </code>
    );
  },
  hr: () => null,
};

export default async function ChangelogDetailPage({ params }: ChangelogDetailPageProps) {
  const { slug } = await params;
  const [markdown, summary, version] = await Promise.all([
    getChangelogDetailMarkdown(slug),
    getChangelogCommitSummary(slug),
    getVersionForSlug(slug),
  ]);

  if (!markdown) {
    notFound();
  }

  return (
    <PageContainer>
      <Container
        padding="lg"
        className="mx-auto max-w-3xl space-y-4 sm:space-y-6"
      >
        <header
          className="space-y-4"
        >
          <Button
            href="/changelog"
            variant="secondary"
            size="md"
            icon={
              <ArrowLeftIcon
                className="h-4 w-4"
              />
            }
          >
            Back to changelog
          </Button>
          <div
            className="space-y-2"
          >
            <div
              className="flex flex-wrap items-center gap-2"
            >
              {version && (
                <span
                  className="rounded-full border border-border-color bg-background px-3 py-1 text-xs font-medium text-foreground/80"
                >
                  v
                  {version}
                </span>
              )}
              <span
                className="inline-block rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white"
              >
                {slug}
              </span>
            </div>
            {summary && (
              <h1
                className="text-2xl font-semibold leading-snug text-foreground sm:text-2xl mt-4 sm:mt-6"
              >
                {summary}
              </h1>
            )}
          </div>
        </header>

        <article>
          <ReactMarkdown
            components={markdownComponents}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </Container>
    </PageContainer>
  );
}
