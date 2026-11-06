<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Generated database artifacts

Do **not** edit `src/database.types.ts` or `supabase/migrations/00000000000000_baseline.sql` by hand. After schema changes: add a dated migration under `supabase/migrations/`, apply it, then run `pnpm db:sync` (pulls types and baseline from the VPS). See README “Generate Supabase Types”.
