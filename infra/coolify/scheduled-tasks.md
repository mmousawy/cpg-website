# Coolify scheduled tasks (replaces Vercel Cron)

Configure these under **Application → Configuration → Scheduled Tasks** in Coolify.
Commands run **inside the app container** (do not prefix with `docker exec`).

All routes expect: `Authorization: Bearer <CRON_SECRET>` (same value as the `CRON_SECRET` env var).

**Timezone:** Coolify uses the **server timezone**. Vercel crons were UTC. If the VPS uses `Europe/Amsterdam`, adjust cron expressions or set the server to UTC.

Use `http://127.0.0.1:3000` — the **container** port (always 3000), not the host bind. Production host is also `:3000`; staging host is `:2000` (see [PORTS.md](./PORTS.md)).

## Tasks

| Name | Cron (UTC, match vercel.json) | Command |
| --- | --- | --- |
| Event reminders | `0 8 * * *` | `curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/event-reminders` |
| Weekly digest | `0 8 * * 0` | `curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/weekly-digest` |
| Revalidate events | `1 * * * *` | `curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/revalidate-events` |
| Cleanup deleted content | `0 3 * * 0` | `curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/cleanup-deleted-content` |
| Flush notification emails | `*/5 * * * *` | `curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/send-pending-notification-emails` |

Set **Timeout** to at least `600` seconds for event-reminders and weekly-digest (they send email).

## Verify

After deploy, open each task and click **Execute now**. Check:

- Task execution status is success
- Application logs show the cron handler completing
- No `401 Unauthorized` (wrong `CRON_SECRET`)

The **Flush notification emails** task runs every 5 minutes so debounced activity mail sends soon after the 15-minute quiet window. Event-reminders and revalidate-events still flush pending batches as a backup.
