/**
 * Fails if database.types.ts was regenerated without postprocess-database-types.mjs.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES_PATH = path.join(ROOT, 'src', 'database.types.ts');
const source = readFileSync(TYPES_PATH, 'utf8');

const MARKER = '@postprocessed-database-types';
const errors = [];

if (!source.includes(MARKER)) {
  errors.push(
    `Missing ${MARKER} marker. Regenerate with: pnpm db:types`,
  );
}

if (
  /^\s+p_[a-z0-9_]*_catalog_id: string$/m.test(source)
) {
  errors.push(
    'Found RPC catalog_id args typed as `string` only. Run: pnpm db:types',
  );
}

if (errors.length > 0) {
  console.error('database.types.ts verification failed:\n');
  for (const message of errors) {
    console.error(`  - ${message}`);
  }
  process.exit(1);
}
