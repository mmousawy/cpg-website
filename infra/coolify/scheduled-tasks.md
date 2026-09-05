# Coolify scheduled tasks (replaces Vercel Cron)

Configure these under **Application → Configuration → Scheduled Tasks** in Coolify.
Commands run **inside the app container** (do not prefix with `docker exec`).

All routes expect: `Authorization: Bearer <CRON_SECRET>` (same value as the `CRON_SECRET` env var).

**Timezone:** Coolify uses the **server timezone**. Vercel crons were UTC. If the VPS uses `Europe/Amsterdam`, adjust cron expressions or set the server to UTC.

Use `http://127.0.0.1:3000` so tasks hit the local process (not the public URL / Cloudflare).

## Tasks

| Name | Cron (UTC, match vercel.json) | Command |
| --- | --- | --- |
| Event reminders | `0 8 * * *` | `curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/event-reminders` |
| Weekly digest | `0 8 * * 0` | `curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/weekly-digest` |
| Revalidate events (afternoon) | `1 13 * * *` | `curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/revalidate-events` |
| Revalidate events (evening) | `1 17 * * *` | `curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/revalidate-events` |
| Cleanup deleted content | `0 3 * * 0` | `curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/cleanup-deleted-content` |

Set **Timeout** to at least `600` seconds for event-reminders and weekly-digest (they send email).

## Verify

After deploy, open each task and click **Execute now**. Check:

- Task execution status is success
- Application logs show the cron handler completing
- No `401 Unauthorized` (wrong `CRON_SECRET`)

`/api/cron/send-pending-notification-emails` is not scheduled separately; pending emails are flushed from event-reminders and revalidate-events.
