import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const CHANGELOG_DIR = join(process.cwd(), 'changelog');
const CHANGELOG_MD = join(process.cwd(), 'CHANGELOG.md');

interface ChangelogEntry {
  version: string;
  date: string;
}

function parseChangelogEntries(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = content.split('\n');
  const versionRegex = /^## \[([^\]]+)\](?:\([^)]+\))?\s*\(([^)]+)\)/;

  for (const line of lines) {
    const match = line.trim().match(versionRegex);
    if (match) {
      entries.push({ version: match[1], date: match[2] });
    }
  }
  return entries;
}

/**
 * Returns all changelog folder slugs (e.g. ['2026-01-30', '2026-01-29', '2026-01-18-1', ...])
 * sorted by slug descending (newest first).
 */
export async function getChangelogSlugs(): Promise<string[]> {
  try {
    const entries = await readdir(CHANGELOG_DIR, { withFileTypes: true });
    const slugs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort((a, b) => b.localeCompare(a));
    return slugs;
  } catch {
    return [];
  }
}

/**
 * Returns all slugs that match the given date (exact match or date-*), sorted.
 * E.g. getSlugsForDate(slugs, '2026-01-18') => ['2026-01-18-1', '2026-01-18-2', '2026-01-18-3'].
 */
export function getSlugsForDate(slugs: string[], date: string): string[] {
  const exact = slugs.filter((s) => s === date);
  const prefixed = slugs.filter((s) => s.startsWith(`${date}-`)).sort();
  if (exact.length > 0) return exact;
  return prefixed;
}

/**
 * Reads files-changed.md for a changelog slug. Returns null if not found.
 */
export async function getChangelogDetailMarkdown(slug: string): Promise<string | null> {
  try {
    const path = join(CHANGELOG_DIR, slug, 'files-changed.md');
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Reads commit-message.txt first line (summary) for a changelog slug. Returns null if not found.
 */
export async function getChangelogCommitSummary(slug: string): Promise<string | null> {
  try {
    const path = join(CHANGELOG_DIR, slug, 'commit-message.txt');
    const content = await readFile(path, 'utf-8');
    const firstLine = content.split('\n')[0]?.trim();
    return firstLine ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns the version from CHANGELOG.md that maps to this slug (by date), or null if none.
 */
export async function getVersionForSlug(slug: string): Promise<string | null> {
  try {
    const [slugs, content] = await Promise.all([
      getChangelogSlugs(),
      readFile(CHANGELOG_MD, 'utf-8'),
    ]);
    const entries = parseChangelogEntries(content);
    for (const entry of entries) {
      const entrySlugs = getSlugsForDate(slugs, entry.date);
      if (entrySlugs.includes(slug)) {
        return entry.version;
      }
    }
    return null;
  } catch {
    return null;
  }
}
