import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import { createMetadata } from '@/utils/metadata';
import { readFile } from 'fs/promises';
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

  return entries;
}

export default async function ChangelogPage() {
  const changelogPath = join(process.cwd(), 'CHANGELOG.md');
  let changelogContent = '';

  try {
    changelogContent = await readFile(changelogPath, 'utf-8');
  } catch (error) {
    console.error('Failed to read CHANGELOG.md:', error);
  }

  const entries = changelogContent ? parseChangelog(changelogContent) : [];

  // Section order preference
  const sectionOrder = ['Features', 'Bug Fixes', 'Performance', 'Refactoring', 'Documentation', 'Maintenance', 'Tests', 'CI/CD'];

  return (
    <PageContainer>
      <Container
        padding="lg"
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

                return (
                  <section
                    key={entry.version}
                    className="not-last:border-b border-border-color space-y-2 sm:space-y-4 pb-6 sm:pb-8"
                  >
                    <div
                      className="flex items-baseline gap-3"
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
                      {entry.compareUrl && (
                        <a
                          href={entry.compareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 ml-auto text-sm text-primary hover:underline"
                        >
                          View on GitHub
                          {' '}
                          <ArrowRightIcon
                            className="w-4 h-4 fill-current"
                          />
                        </a>
                      )}
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
        </div>
      </Container>
    </PageContainer>
  );
}
