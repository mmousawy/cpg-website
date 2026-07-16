// Dev-server memory logger. Attach via NODE_OPTIONS='--require ./scripts/memlog.mjs'.
// Prints RSS / heap / external every 15s so we can catch server-side leaks.
// Also snapshots on SIGUSR2 (POSIX) or writes on-demand when heapUsed grows > 512MB.

import { writeHeapSnapshot } from 'node:v8';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), '.heap');
try {
  mkdirSync(OUT_DIR, { recursive: true });
} catch {}

const started = Date.now();
const mb = (n) => (n / 1024 / 1024).toFixed(1);
let peakHeap = 0;
let nextSnapshotAt = 512; // MB

function log(prefix = 'mem') {
  const m = process.memoryUsage();
  const heapMB = m.heapUsed / 1024 / 1024;
  if (heapMB > peakHeap) peakHeap = heapMB;
  const uptime = ((Date.now() - started) / 1000).toFixed(0);
  console.log(
    `[${prefix} +${uptime}s] rss=${mb(m.rss)}MB heap=${mb(m.heapUsed)}/${mb(
      m.heapTotal,
    )}MB external=${mb(m.external)}MB arrayBuffers=${mb(m.arrayBuffers)}MB peak=${peakHeap.toFixed(1)}MB`,
  );

  // Auto-snapshot when heap crosses growing thresholds (512, 1024, 2048 MB, ...)
  if (heapMB >= nextSnapshotAt) {
    const file = join(OUT_DIR, `auto-${Math.round(heapMB)}MB-${Date.now()}.heapsnapshot`);
    try {
      writeHeapSnapshot(file);
      console.log(`[mem] wrote heap snapshot: ${file}`);
    } catch (e) {
      console.log(`[mem] snapshot failed: ${e.message}`);
    }
    nextSnapshotAt *= 2;
  }
}

setInterval(log, 15_000).unref();
log('mem-init');

// Manual snapshot: send SIGUSR2 (POSIX) or hit the /snapshot endpoint you add later.
process.on('SIGUSR2', () => {
  const file = join(OUT_DIR, `manual-${Date.now()}.heapsnapshot`);
  writeHeapSnapshot(file);
  console.log(`[mem] wrote manual heap snapshot: ${file}`);
});
