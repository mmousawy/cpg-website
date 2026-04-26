import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import { buildVersionSlugMaps, getChangelogContent, parseChangelog } from '@/lib/changelog';
import { createMetadata } from '@/utils/metadata';
import { cacheLife, cacheTag } from 'next/cache';
import Link from 'next/link';

import ArrowRightIcon from 'public/icons/arrow-right.svg';

export const metadata = createMetadata({
  title: 'Changelog',
  description: 'View all updates and changes to Creative Photography Group',
  canonical: '/changelog',
});

export default async function ChangelogPage() {
  'use cache';
  cacheLife('max');
  cacheTag('changelog');

  const changelogContent = await getChangelogContent();
  const entries = changelogContent ? parseChangelog(changelogContent) : [];
  const { versionToSlug } = await buildVersionSlugMaps();

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
            <h1
              className="mb-2 sm:mb-4 text-2xl font-bold sm:text-3xl"
            >
              Changelog
            </h1>
            <p
              className="text-sm text-foreground/70"
            >
              All changes to the Creative Photography Group app are listed here.
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
            <>
              <Link
                href="/changelog/details"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View detailed changes
                <ArrowRightIcon
                  className="w-4 h-4 fill-current"
                />
              </Link>

              <div
                className="overflow-x-auto"
              >
                <table
                  className="w-full text-sm"
                >
                  <thead>
                    <tr
                      className="border-b border-border-color text-left"
                    >
                      <th
                        className="pb-2 pr-4 font-medium text-foreground/70"
                      >
                        Version
                      </th>
                      <th
                        className="pb-2 pr-4 font-medium text-foreground/70"
                      >
                        Date
                      </th>
                      <th
                        className="pb-2 font-medium text-foreground/70"
                      >
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const slug = versionToSlug.get(entry.version);
                      const hasDetailPage = slug !== undefined;

                      return (
                        <tr
                          key={entry.version}
                          className="border-b border-border-color/50 last:border-b-0 align-top"
                        >
                          <td
                            className="py-2 pr-4 whitespace-nowrap"
                          >
                            {hasDetailPage ? (
                              <Link
                                href={`/changelog/${slug}`}
                                className="text-primary hover:underline font-medium"
                              >
                                v
                                {entry.version}
                              </Link>
                            ) : (
                              <span
                                className="text-foreground/60"
                              >
                                v
                                {entry.version}
                              </span>
                            )}
                          </td>
                          <td
                            className="py-2 pr-4 whitespace-nowrap text-foreground/60"
                          >
                            {entry.date}
                          </td>
                          <td
                            className="py-2"
                          >
                            {entry.description || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Container>
    </PageContainer>
  );
}
