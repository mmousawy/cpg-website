import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import { getChangelogSlugs, getSlugsForDate } from '@/lib/changelog';
import { createMetadata } from '@/utils/metadata';
import { readFile } from 'fs/promises';
import { cacheLife, cacheTag } from 'next/cache';
import Link from 'next/link';
import { join } from 'path';

import ArrowRightIcon from 'public/icons/arrow-right.svg';

export const metadata = createMetadata({
  title: 'Changelog',
  description: 'View all updates and changes to Creative Photography Group',
  canonical: '/changelog',
});

interface ChangelogEntry {
  version: string;
  date: string;
  compareUrl?: string;
  description?: string;
  sections: {
    [key: string]: string[];
  };
}

function parseChangelog(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = content.split('\n');

  let currentEntry: ChangelogEntry | null = null;
  let currentSection: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Version header: ## [1.11.0](url) (2026-01-21)
    const versionMatch = line.match(/^## \[([^\]]+)\](?:\(([^)]+)\))?\s*\(([^)]+)\)/);
    if (versionMatch) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      currentEntry = {
        version: versionMatch[1],
        date: versionMatch[3],
        compareUrl: versionMatch[2],
        sections: {},
      };
      currentSection = null;
      continue;
    }

    if (!currentEntry) continue;

    // Section header: ### Features, ### Bug Fixes, etc.
    const sectionMatch = line.match(/^### (.+)$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!currentEntry.sections[currentSection]) {
        currentEntry.sections[currentSection] = [];
      }
      continue;
    }

    // Bullet point: * description ([commit](url))
    const bulletMatch = line.match(/^\*\s+(.+)$/);
    if (bulletMatch && currentSection) {
      currentEntry.sections[currentSection].push(bulletMatch[1]);
      continue;
    }

    // Empty line or other content - skip
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  // Extract first description from each entry
  for (const entry of entries) {
    const allItems = Object.values(entry.sections).flat();
    if (allItems.length > 0) {
      // Remove markdown links and commit hashes for a cleaner description
      let desc = allItems[0];
      desc = desc.replace(/\s*\(\[[^\]]+\]\([^)]+\)\)$/, ''); // Remove ([hash](url)) at end
      desc = desc.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Replace [text](url) with text
      entry.description = desc;
    }
  }

  return entries;
}

export default async function ChangelogPage() {
  'use cache';
  cacheLife('max');
  cacheTag('changelog');

  const changelogPath = join(process.cwd(), 'CHANGELOG.md');
  let changelogContent = '';

  try {
    changelogContent = await readFile(changelogPath, 'utf-8');
  } catch (error) {
    console.error('Failed to read CHANGELOG.md:', error);
  }

  const entries = changelogContent ? parseChangelog(changelogContent) : [];
  const changelogSlugs = await getChangelogSlugs();

  // Build version <-> slug mappings
  // Each slug's date prefix is matched to a CHANGELOG entry with the same date
  const slugToVersion = new Map<string, string>();
  const versionToSlug = new Map<string, string>();

  // Group entries by date for quick lookup
  const entriesByDate = new Map<string, string[]>();
  for (const entry of entries) {
    const versions = entriesByDate.get(entry.date) || [];
    versions.push(entry.version);
    entriesByDate.set(entry.date, versions);
  }

  // For each slug, extract the date and find the matching version(s)
  for (const slug of changelogSlugs) {
    // Extract date from slug: "2026-01-18-1" -> "2026-01-18", "2026-01-30" -> "2026-01-30"
    const dateMatch = slug.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const date = dateMatch[1];
      const versions = entriesByDate.get(date);
      if (versions && versions.length > 0) {
        // If multiple versions for this date, assign based on slug suffix
        // e.g., 2026-01-18-1 gets first version (oldest), 2026-01-18-2 gets second, etc.
        const slugsForDate = getSlugsForDate(changelogSlugs, date);
        const slugIndex = slugsForDate.indexOf(slug);
        // Versions are in newest-first order, so reverse to get oldest-first
        const versionsOldestFirst = [...versions].reverse();
        if (slugIndex >= 0 && slugIndex < versionsOldestFirst.length) {
          const version = versionsOldestFirst[slugIndex];
          slugToVersion.set(slug, version);
          versionToSlug.set(version, slug);
        } else if (versionsOldestFirst.length > 0) {
          // More slugs than versions: assign last version to remaining slugs
          const version = versionsOldestFirst[versionsOldestFirst.length - 1];
          slugToVersion.set(slug, version);
          // Don't overwrite versionToSlug - keep first slug for each version
        }
      }
    }
  }

  // Section order preference
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
            <div
              className="space-y-6 sm:space-y-8"
            >
              {entries.map((entry) => {
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
                              // Parse markdown links: [text](url)
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

          {entries.length > 0 && (
            <section
              className="border-t border-border-color pt-6 sm:pt-8"
            >
              <h2
                className="mb-4 text-lg font-semibold sm:text-xl"
              >
                Overview of all changes
              </h2>
              <p
                className="mb-4 text-sm text-foreground/70"
              >
                Full file-by-file notes for each release.
              </p>
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
                            className={hasDetailPage ? 'py-2' : 'py-2'}
                          >
                            {entry.description || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </Container>
    </PageContainer>
  );
}
