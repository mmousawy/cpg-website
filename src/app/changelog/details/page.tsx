import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import { buildVersionSlugMaps, getChangelogContent, parseChangelog } from '@/lib/changelog';
import { createMetadata } from '@/utils/metadata';
import { cacheLife, cacheTag } from 'next/cache';
import Link from 'next/link';

import ArrowRightIcon from 'public/icons/arrow-right.svg';

const ENTRIES_PER_PAGE = 10;

export const metadata = createMetadata({
  title: 'Changelog — Detailed Changes',
  description: 'Detailed list of all updates and changes to Creative Photography Group',
  canonical: '/changelog/details',
});

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function ChangelogDetailsPage({ searchParams }: PageProps) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1);

  return <CachedDetailsContent
    currentPage={currentPage}
  />;
}

async function CachedDetailsContent({ currentPage }: { currentPage: number }) {
  'use cache';
  cacheLife('max');
  cacheTag('changelog');

  const changelogContent = await getChangelogContent();
  const entries = changelogContent ? parseChangelog(changelogContent) : [];
  const { versionToSlug } = await buildVersionSlugMaps();

  const totalPages = Math.max(1, Math.ceil(entries.length / ENTRIES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ENTRIES_PER_PAGE;
  const paginatedEntries = entries.slice(startIndex, startIndex + ENTRIES_PER_PAGE);

  const sectionOrder = ['Features', 'Bug Fixes', 'Performance', 'Refactoring', 'Documentation', 'Maintenance', 'Tests', 'CI/CD'];

  return (
    <PageContainer>
      <Container
        padding="md"
        className="mx-auto max-w-3xl"
      >
        <div
          className="space-y-6 sm:space-y-8 text-sm sm:text-base"
        >
          <div
            className="prose prose-slate dark:prose-invert max-w-none"
          >
            <Link
              href="/changelog"
              className="text-sm text-primary hover:underline no-underline flex items-center gap-1 mb-4"
            >
              <ArrowRightIcon
                className="w-4 h-4 fill-current rotate-180"
              />
              Back to overview
            </Link>
            <h1
              className="mb-2 sm:mb-4 text-2xl font-bold sm:text-3xl"
            >
              Detailed Changes
            </h1>
            <p
              className="text-sm text-foreground/70"
            >
              Full breakdown of features, fixes, and other changes per version.
            </p>
          </div>

          {entries.length === 0 ? (
            <div
              className="rounded-lg border border-border-color bg-background-light p-6 text-center"
            >
              <p
                className="text-foreground/70"
              >
                No changelog entries found.
              </p>
            </div>
          ) : (
            <div
              className="space-y-6 sm:space-y-8"
            >
              {paginatedEntries.map((entry) => {
                const sortedSections = Object.keys(entry.sections).sort((a, b) => {
                  const aIndex = sectionOrder.indexOf(a);
                  const bIndex = sectionOrder.indexOf(b);
                  if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                  if (aIndex === -1) return 1;
                  if (bIndex === -1) return -1;
                  return aIndex - bIndex;
                });

                const detailSlug = versionToSlug.get(entry.version);

                return (
                  <section
                    key={entry.version}
                    className="not-last:border-b border-border-color space-y-2 sm:space-y-4 pb-6 sm:pb-8"
                  >
                    <div
                      className="flex flex-wrap items-baseline gap-3"
                    >
                      <h2
                        className="text-xl font-semibold sm:text-2xl"
                      >
                        {entry.version}
                      </h2>
                      <span
                        className="text-sm text-foreground/60"
                      >
                        {entry.date}
                      </span>
                      <span
                        className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 min-w-0"
                      >
                        {detailSlug && (
                          <Link
                            href={`/changelog/${detailSlug}`}
                            className="text-sm text-primary hover:underline shrink-0"
                          >
                            Read all changes
                          </Link>
                        )}
                        {entry.compareUrl && (
                          <a
                            href={entry.compareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 ml-auto text-sm text-primary hover:underline shrink-0"
                          >
                            View on GitHub
                            {' '}
                            <ArrowRightIcon
                              className="w-4 h-4 fill-current"
                            />
                          </a>
                        )}
                      </span>
                    </div>

                    {sortedSections.map((sectionName) => {
                      const items = entry.sections[sectionName];
                      if (items.length === 0) return null;

                      return (
                        <div
                          key={sectionName}
                        >
                          <h3
                            className="mb-3 text-lg font-medium sm:text-xl"
                          >
                            {sectionName}
                          </h3>
                          <ul
                            className="ml-6 list-disc space-y-1"
                          >
                            {items.map((item, idx) => {
                              const parts: (string | React.ReactElement)[] = [];
                              let lastIndex = 0;
                              const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                              let match;

                              while ((match = linkRegex.exec(item)) !== null) {
                                if (match.index > lastIndex) {
                                  parts.push(item.slice(lastIndex, match.index));
                                }
                                parts.push(
                                  <a
                                    key={match.index}
                                    href={match[2]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {match[1]}
                                  </a>,
                                );
                                lastIndex = match.index + match[0].length;
                              }

                              if (lastIndex < item.length) {
                                parts.push(item.slice(lastIndex));
                              }

                              return (
                                <li
                                  key={idx}
                                >
                                  {parts.length > 0 ? parts : item}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </Container>

      {totalPages > 1 && (
        <nav
          aria-label="Changelog pagination"
          className="flex items-center justify-between px-4 py-6 sm:py-8 max-w-3xl mx-auto"
        >
          {safePage > 1 ? (
            <Link
              href={safePage === 2 ? '/changelog/details' : `/changelog/details?page=${safePage - 1}`}
              className="inline-flex items-center gap-1 rounded-md border border-border-color px-3 py-1.5 text-sm hover:bg-background-light transition-colors"
            >
              <ArrowRightIcon
                className="w-4 h-4 fill-current rotate-180"
              />
              Previous
            </Link>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-border-color/50 px-3 py-1.5 text-sm text-foreground/30 cursor-not-allowed"
            >
              <ArrowRightIcon
                className="w-4 h-4 fill-current rotate-180"
              />
              Previous
            </span>
          )}

          <span
            className="text-sm text-foreground/60"
          >
            Page
            {' '}
            {safePage}
            {' '}
            of
            {' '}
            {totalPages}
          </span>

          {safePage < totalPages ? (
            <Link
              href={`/changelog/details?page=${safePage + 1}`}
              className="inline-flex items-center gap-1 rounded-md border border-border-color px-3 py-1.5 text-sm hover:bg-background-light transition-colors"
            >
              Next
              <ArrowRightIcon
                className="w-4 h-4 fill-current"
              />
            </Link>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-border-color/50 px-3 py-1.5 text-sm text-foreground/30 cursor-not-allowed"
            >
              Next
              <ArrowRightIcon
                className="w-4 h-4 fill-current"
              />
            </span>
          )}
        </nav>
      )}
    </PageContainer>
  );
}
