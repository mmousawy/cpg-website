#!/usr/bin/env npx tsx
/**
 * Check profile URL publish verdicts for a list of URLs.
 *
 * Usage:
 *   pnpm check:urls urls.txt
 *
 * File format: one URL per line. Optional tab-separated member full name for portfolio matching.
 * Lines starting with # are ignored.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { config } from 'dotenv';

import { checkProfileUrl } from '../src/lib/profileUrl/checkProfileUrl';

config({ path: resolve(process.cwd(), '.env.local') });

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: pnpm check:urls <urls.txt>');
  process.exit(1);
}

const raw = readFileSync(resolve(process.cwd(), filePath), 'utf8');
const lines = raw.split(/\r?\n/);

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;

  const [urlPart, memberName] = trimmed.split('\t');
  const url = urlPart.trim();
  const result = await checkProfileUrl(url, {
    memberFullName: memberName?.trim() || undefined,
  });

  const schema = result.schemaTypes.length > 0 ? result.schemaTypes.join(', ') : '—';
  const title = result.title ?? '—';
  console.log(
    [
      result.verdict.toUpperCase(),
      result.reason,
      result.safeBrowsing,
      title,
      schema,
      url,
    ].join('\t'),
  );
}
