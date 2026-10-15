/**
 * Pull generated DB types and a schema baseline from the VPS.
 *
 * Reads from .env.local:
 *   SSH_HOST
 *   SSH_USER
 *   SSH_PASSWORD
 *   SUPABASE_DB_URL   postgres URL as seen on the VPS (localhost in the host)
 *
 * Usage: pnpm db:sync
 */
import { spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';
import { Client } from 'ssh2';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES_PATH = path.join(ROOT, 'src', 'database.types.ts');
const BASELINE_PATH = path.join(ROOT, 'supabase', 'migrations', '00000000000000_baseline.sql');

config({ path: path.join(ROOT, '.env.local') });

const sshHost = process.env.SSH_HOST;
const sshUser = process.env.SSH_USER;
const sshPassword = process.env.SSH_PASSWORD;
const dbUrl = process.env.SUPABASE_DB_URL;

if (!sshHost) {
  console.error('Missing SSH_HOST in .env.local');
  process.exit(1);
}
if (!sshUser) {
  console.error('Missing SSH_USER in .env.local');
  process.exit(1);
}
if (!sshPassword) {
  console.error('Missing SSH_PASSWORD in .env.local');
  process.exit(1);
}
if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL in .env.local');
  process.exit(1);
}

function bashSingleQuote(value) {
  return `'${value.replaceAll("'", '\'\\\'\'')}'`;
}

const quotedDbUrl = bashSingleQuote(dbUrl);

function sshExecToFile(remoteCommand, destPath) {
  const tmpPath = `${destPath}.tmp`;

  return new Promise((resolve, reject) => {
    const conn = new Client();
    const fail = (error) => {
      conn.end();
      unlink(tmpPath).catch(() => {});
      reject(error);
    };

    conn.on('ready', () => {
      conn.exec(remoteCommand, (error, stream) => {
        if (error) {
          fail(error);
          return;
        }

        const file = createWriteStream(tmpPath);
        let stderr = '';
        stream.pipe(file);
        stream.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });
        stream.on('close', (code) => {
          file.end(() => {
            conn.end();
            if (code !== 0) {
              unlink(tmpPath).catch(() => {});
              reject(new Error(stderr.trim() || `Remote command failed (${code})`));
              return;
            }
            rename(tmpPath, destPath).then(resolve, reject);
          });
        });
      });
    });

    conn.on('error', fail);
    conn.connect({
      host: sshHost,
      username: sshUser,
      password: sshPassword,
      readyTimeout: 30_000,
      hostVerifier: () => true,
    });
  });
}

async function main() {
  console.log('Generating database types…');
  await sshExecToFile(
    `npx supabase gen types typescript --db-url ${quotedDbUrl} --schema public`,
    TYPES_PATH,
  );

  console.log('Post-processing database types…');
  const postprocess = spawnSync(process.execPath, ['scripts/postprocess-database-types.mjs'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (postprocess.status !== 0) {
    process.exit(postprocess.status ?? 1);
  }

  console.log('Dumping schema baseline…');
  await sshExecToFile(
    `npx supabase db dump --db-url ${quotedDbUrl}`,
    BASELINE_PATH,
  );

  console.log('Done.');
  console.log(`  ${path.relative(ROOT, TYPES_PATH)}`);
  console.log(`  ${path.relative(ROOT, BASELINE_PATH)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
