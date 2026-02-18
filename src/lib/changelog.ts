import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const CHANGELOG_DIR = join(process.cwd(), 'changelog');
const CHANGELOG_MD = join(process.cwd(), 'CHANGELOG.md');

interface VersionShas {
  version: string;
  shas: string[];
}

/**
 * Parses CHANGELOG.md and extracts the short commit SHAs for each version.
 * e.g. "* some feature ([d705c96](url))" → sha "d705c96" under that version.
 */
function parseVersionShas(content: string): VersionShas[] {
  const entries: VersionShas[] = [];
  const lines = content.split('\n');
  const versionRegex = /^## \[([^\]]+)\]/;
  const shaRegex = /\((\[([a-f0-9]{7,})\]\([^)]+\))\)\s*$/;

  let current: VersionShas | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const vMatch = trimmed.match(versionRegex);
    if (vMatch) {
      if (current) entries.push(current);
      current = { version: vMatch[1], shas: [] };
      continue;
    }
    if (!current) continue;
    const sMatch = trimmed.match(shaRegex);
    if (sMatch) {
      current.shas.push(sMatch[2]);
    }
  }
  if (current) entries.push(current);
  return entries;
}

/**
 * Returns all changelog folder slugs sorted by slug descending (newest first).
 */
export async function getChangelogSlugs(): Promise<string[]> {
  try {
    const entries = await readdir(CHANGELOG_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort((a, b) => b.localeCompare(a));
  } catch {
    return [];
  }
}

/**
 * Reads sha.txt from a changelog folder. Returns null if not found.
 */
async function getChangelogSha(slug: string): Promise<string | null> {
  try {
    const path = join(CHANGELOG_DIR, slug, 'sha.txt');
    const content = await readFile(path, 'utf-8');
    return content.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Builds a bidirectional version<->slug mapping by matching each slug's
 * sha.txt against the commit SHAs embedded in CHANGELOG.md bullet points.
 */
export async function buildVersionSlugMaps(): Promise<{
  versionToSlug: Map<string, string>;
  slugToVersion: Map<string, string>;
}> {
  const versionToSlug = new Map<string, string>();
  const slugToVersion = new Map<string, string>();

  const [slugs, mdContent] = await Promise.all([
    getChangelogSlugs(),
    readFile(CHANGELOG_MD, 'utf-8').catch(() => ''),
  ]);

  if (!mdContent) return { versionToSlug, slugToVersion };

  const versionEntries = parseVersionShas(mdContent);

  // sha (short) -> version
  const shaToVersion = new Map<string, string>();
  for (const entry of versionEntries) {
    for (const sha of entry.shas) {
      shaToVersion.set(sha, entry.version);
    }
  }

  // Read all sha.txt files in parallel
  const shaResults = await Promise.all(
    slugs.map(async (slug) => ({
      slug,
      sha: await getChangelogSha(slug),
    })),
  );

  for (const { slug, sha } of shaResults) {
    if (!sha) continue;
    // Match short SHA prefix (sha.txt may contain 7+ chars)
    const version =
      shaToVersion.get(sha) ??
      [...shaToVersion.entries()].find(
        ([k]) => k.startsWith(sha) || sha.startsWith(k),
      )?.[1];

    if (version) {
      slugToVersion.set(slug, version);
      if (!versionToSlug.has(version)) {
        versionToSlug.set(version, slug);
      }
    }
  }

  return { versionToSlug, slugToVersion };
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
 * Returns the version from CHANGELOG.md that maps to this slug, or null if none.
 */
export async function getVersionForSlug(slug: string): Promise<string | null> {
  try {
    const { slugToVersion } = await buildVersionSlugMaps();
    return slugToVersion.get(slug) ?? null;
  } catch {
    return null;
  }
}
