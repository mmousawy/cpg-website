/**
 * Patches src/database.types.ts after `supabase gen types`.
 *
 * Supabase CLI often types nullable Postgres `uuid` function arguments as `string`
 * only. Our app and tables use `string | null` for optional catalog IDs.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES_PATH = path.join(ROOT, 'src', 'database.types.ts');
const MARKER = '@postprocessed-database-types';

let source = readFileSync(TYPES_PATH, 'utf8');

if (!source.includes(MARKER)) {
  const banner = `// ${MARKER} — applied by scripts/postprocess-database-types.mjs after supabase gen types\n`;
  source = banner + source;
}

const patched = source.replace(
  /^(\s+p_[a-z0-9_]*_catalog_id): string$/gm,
  '$1: string | null',
);

writeFileSync(TYPES_PATH, patched);

const eslintBin = path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
const eslint = spawnSync(
  process.execPath,
  [
    eslintBin,
    '--fix',
    '--max-warnings=999999',
    TYPES_PATH,
  ],
  { cwd: ROOT, stdio: 'inherit' },
);

if (eslint.status !== 0) {
  process.exit(eslint.status ?? 1);
}

console.log(`Post-processed and formatted ${path.relative(ROOT, TYPES_PATH)}`);
