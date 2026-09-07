# VPS resources (6 cores / 11 GB RAM)

This server runs **a lot at once**:

| Layer | What |
| --- | --- |
| Coolify | dashboard, proxy, build workers |
| Supabase ×2 | prod + staging (Postgres, Kong, Logflare, Realtime, Supavisor, …) |
| Next.js ×2 | prod (`:3000`) + staging (`:2000`) |

A **Coolify Docker build** (`docker buildx` + `pnpm build` + Next/webpack workers) adds **several GB RAM** and most CPUs on top of that. With **no swap**, the kernel OOM-kills processes — often Logflare (`beam.smp`), systemd, or other “important” PIDs while build workers keep running.

**Disk is usually fine; RAM is the bottleneck.**

## Healthy vs crisis

| Signal | Healthy (this box) | Crisis |
| --- | --- | --- |
| Load (1 / 5 / 15 min) | ≲ 6 | 50–130+ and rising |
| RAM available | a few GB free | &lt; 1 GB |
| Swap | some (safety net) | none |
| OOM in `dmesg` | none | `Out of memory: Killed process` |

Rising load (1-min &gt; 5-min &gt; 15-min) means things are **getting worse**, not recovering.

---

## Stop the bleed (deploy in progress)

### 1. Cancel the Coolify deploy

**Coolify UI** → app that is building → **Cancel**. Easiest if SSH is laggy.

### 2. Or stop only build containers (SSH)

```bash
docker ps -a --filter name=build --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}'
docker stats --no-stream
```

Stop **build / buildx / coolify-helper** containers only — **not** Postgres, Kong, `coolify`, or `next-server`.

```bash
docker stop <BUILD_CONTAINER_ID>
```

Do **not** `kill -9` random PIDs or stop Supabase DB.

### 3. Confirm recovery

```bash
uptime
free -h
```

Load should fall toward single digits; available memory should rise.

### 4. Last resort

```bash
sudo reboot
```

Restarts everything (both Supabase stacks, Coolify, both Next apps). Prefer cancelling the build.

---

## After recovery (prevent repeat)

### Add swap (recommended once)

Does not fix overload but reduces sudden OOM kills:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Coolify build settings

In the app → **Environment** (build-time):

```env
NODE_OPTIONS=--max-old-space-size=2048
```

Also in Coolify: **lower build CPU/RAM** if available; **never deploy prod and staging at the same time**.

### Do not build on this VPS (best long-term)

| Option | Idea |
| --- | --- |
| **CI builds image** | GitHub Actions builds + pushes to GHCR; Coolify **pulls** prebuilt image (no `pnpm build` on VPS) |
| **Build window** | Stop staging stack (`docker compose -p supabase-staging down`) + pause staging app before prod deploy |
| **Bigger / separate builder** | Second small VPS or cloud builder only for Docker builds |

This repo’s Dockerfile runs `pnpm build` **inside** the image — that is what hammers RAM during Coolify deploy.

### Check for duplicate containers

After a bad OOM/restart:

```bash
docker ps --format '{{.Names}}' | sort
```

Expect **one** Logflare / Realtime / Kong set per environment (`supabase-*` and `supabase-staging-*`), not orphans from failed deploys.

---

## Deploy order (same VPS)

1. **Never** prod + staging Coolify deploys in parallel  
2. Prefer **off-peak** deploys  
3. Watch `free -h` and `uptime` during first deploy after changes  
4. Staging Supabase can be stopped temporarily if you only need to ship prod (see [supabase-staging README](../supabase-staging/README.md))
