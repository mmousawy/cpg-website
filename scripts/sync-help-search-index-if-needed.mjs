/**
 * Pre-commit: regenerate helpSearchIndex.generated.ts when help-related files are staged.
 */
import { execFileSync, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED = 'src/lib/help/helpSearchIndex.generated.ts';

/** Paths that affect searchable help text or entry URLs. */
const TRIGGERS = [
  /^src\/content\/help\//,
  /^scripts\/generate-help-search-index\.ts$/,
  /^vitest\.help-search-index\.config\.ts$/,
];

function stagedFiles() {
  return execFileSync('git', ['diff', '--cached', '--name-only'], {
    encoding: 'utf8',
    cwd: ROOT,
  })
    .split(/\r?\n/)
    .filter(Boolean);
}

const always = process.argv.includes('--always');
const files = stagedFiles();
const shouldRun = always || files.some((file) => TRIGGERS.some((re) => re.test(file)));

if (!shouldRun) {
  process.exit(0);
}

execSync('pnpm help:search-index', { stdio: 'inherit', cwd: ROOT, env: process.env });

if (!always) {
  execFileSync('git', ['add', GENERATED], { stdio: 'inherit', cwd: ROOT });
}
