# Deployment Architecture

Sales Intelligence Platform — **Vercel** (Next.js 15) + **PostgreSQL** (Neon recommended).

---

## Architecture Overview

```mermaid
flowchart TB
  subgraph users [Users]
    Browser[Browser / API clients]
  end

  subgraph vercel [Vercel]
    Edge[Edge Middleware<br/>security headers]
    Next[Next.js App Router<br/>UI + API routes]
    Fn[Serverless Functions<br/>/api/v1/*]
  end

  subgraph data [Data]
    PG[(PostgreSQL<br/>Neon / Vercel Postgres)]
  end

  subgraph external [External Services]
    OpenAI[OpenAI API<br/>discovery + extraction + scoring]
  end

  subgraph worker [Recommended: Crawler Worker]
    Crawler[Playwright worker<br/>Railway / Fly.io]
  end

  Browser --> Edge --> Next
  Next --> Fn
  Fn --> PG
  Fn --> OpenAI
  Fn -.->|HTTP job dispatch| Crawler
  Crawler --> PG
```

### Platform split (important)

| Component | Vercel | Separate worker |
|-----------|--------|-----------------|
| UI (`/search`, `/companies`) | Yes | — |
| REST API (`/api/v1/*`) | Yes | — |
| Prisma / PostgreSQL | Yes (via connection pool) | Optional read replica |
| OpenAI calls | Yes | — |
| Discovery (HTTP sources) | Yes | — |
| **Playwright crawler** | **No** (bundle size + Chromium) | **Yes — required for production crawls** |

Vercel serverless cannot reliably run Playwright. Deploy a dedicated **crawler worker** (Railway, Fly.io, AWS ECS) or use an external crawl API. Until then, search jobs will fail at the crawl stage on Vercel.

Background search orchestration uses Next.js [`after()`](https://nextjs.org/docs/app/api-reference/functions/after) via `scheduleBackgroundTask` in `search-api.factory.ts`, so work continues after the 202 response on Vercel.

---

## Environments

| Environment | Vercel | Database | Branch |
|-------------|--------|----------|--------|
| **Production** | Production domain | Neon production branch | `main` |
| **Preview** | `*.vercel.app` per PR | Neon preview branch (isolated) | PR branches |
| **Local** | `next dev` | Docker Compose Postgres | any |

---

## Environment Variables

Set in **Vercel Project → Settings → Environment Variables**. Use separate values per environment (Production / Preview / Development).

### Required

| Variable | Production | Preview | Description |
|----------|------------|---------|-------------|
| `DATABASE_URL` | Pooled connection string | Preview DB pooled URL | Prisma runtime queries (`?pgbouncer=true` for Neon) |
| `DIRECT_URL` | Direct (non-pooled) URL | Preview direct URL | Prisma migrations & `migrate deploy` |
| `OPENAI_API_KEY` | Prod key | Dev/staging key | OpenAI API |
| `API_AUTH_SECRET` | 32+ char random secret | Staging secret | `Authorization: Bearer <secret>:<userId>` |
| `ALLOW_DEV_UUID_AUTH` | `false` | `true` | Block UUID-only auth in production |

### Application

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` (Vercel sets automatically) | Runtime mode |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat model |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `LOG_PRETTY` | `false` | JSON logs on Vercel (never pretty-print in prod) |
| `LOG_DB_QUERIES` | `false` | SQL query logging |

### Security / rate limits

| Variable | Production default | Description |
|----------|-------------------|-------------|
| `API_RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window |
| `API_RATE_LIMIT_MAX_REQUESTS` | `60` | Max requests per IP per window |
| `API_SEARCH_RATE_LIMIT_MAX` | `5` | Max search POSTs per user per window |
| `API_MAX_CONCURRENT_SEARCHES` | `2` | Active pipeline jobs per user |
| `SEARCH_JOB_PENDING_STALE_MS` | `300000` (5 min) | Fail `PENDING` jobs older than this (orphaned after restart) |
| `SEARCH_JOB_ACTIVE_STALE_MS` | `1200000` (20 min) | Fail in-progress jobs with no updates older than this |
| `API_MAX_JSON_BODY_BYTES` | `16384` | Max request body size |

### Client (staging only)

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_DEV_USER_ID` | **Preview only.** Do not set in production without session auth. |

### Crawler (worker service, not Vercel)

| Variable | Default | Description |
|----------|---------|-------------|
| `CRAWLER_MAX_CONTEXTS` | `3` | Browser contexts |
| `CRAWLER_GLOBAL_CONCURRENCY` | `3` | Parallel crawl operations (shared pool) |
| `CRAWLER_SEARCH_CONCURRENCY` | `3` | Companies crawled in parallel per search job |
| `CRAWLER_RESPECT_ROBOTS` | `true` | Honor robots.txt |
| `CRAWLER_USER_AGENT` | Bot identifier | Include contact URL |

Set `CRAWLER_SEARCH_CONCURRENCY`, `CRAWLER_MAX_CONTEXTS`, and `CRAWLER_GLOBAL_CONCURRENCY` to similar values (e.g. all `3`). Raising search concurrency without enough browser contexts causes queueing.

### Search pipeline (OpenAI stages)

| Variable | Default | Description |
|----------|---------|-------------|
| `SEARCH_EXTRACTION_CONCURRENCY` | `3` | Companies extracted in parallel per search job |
| `SEARCH_SCORING_CONCURRENCY` | `3` | Leads scored in parallel per search job |

Both stages call OpenAI. Keep concurrency modest to avoid rate limits; start at `3` and raise only if your API tier allows it.

### Discovery (OpenAI web search)

Company discovery uses the OpenAI Responses API with the built-in **web search** tool. The full natural-language search query is sent to the model (industry and location are optional hints from the query parser). No DuckDuckGo, Wikidata, or HTTP proxy configuration is required.

Use a web-search-capable model via `OPENAI_MODEL` (for example `gpt-4o-mini` or `gpt-4o`). Discovery shares the same API key as extraction and scoring.

### Neon / Vercel Postgres connection strings

```bash
# Runtime (pooled — use for DATABASE_URL)
postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true

# Migrations (direct — use for DIRECT_URL)
postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

### GitHub Actions secrets (migrations CI)

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | Production pooled URL |
| `DIRECT_URL` | Production direct URL |
| `VERCEL_TOKEN` | Vercel deploy token |
| `VERCEL_ORG_ID` | Vercel team ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

---

## Database Migrations

### Strategy

Migrations run **before** production deploy via GitHub Actions (`.github/workflows/deploy-production.yml`), not during `next build`. This avoids race conditions when multiple Vercel instances build simultaneously.

```
push to main
  → GitHub Action: prisma migrate deploy (production DB)
  → GitHub Action: vercel deploy --prod
  → Vercel build: prisma generate && next build
```

### Commands

| Command | When |
|---------|------|
| `npm run db:migrate` | Local schema changes (`prisma migrate dev`) |
| `npm run db:migrate:deploy` | CI production deploy |
| `npm run db:migrate:status` | Verify applied migrations |
| `npm run db:seed` | Local / staging seed only (not production) |

### Preview deployments

Create a **Neon branch per preview** (Neon-Vercel integration) or use a shared staging database. Never point preview deploys at production `DATABASE_URL`.

### Rollback

Prisma has no automatic down migrations. Rollback procedure:

1. Revert application code on Vercel (instant rollback to previous deployment).
2. If schema must revert, author a forward migration that undoes changes — do not use `migrate reset` on production.

---

## Background Jobs

Search creation returns `202 Accepted` and runs the orchestrator asynchronously. The factory wires Vercel-safe scheduling:

```typescript
// services/application/search-api.factory.ts
scheduleBackgroundTask: (task) => after(task),
```

Unit tests omit this and run the background task immediately.

For long-running pipelines (>60s) or Playwright crawls, move orchestration to:

- **Inngest** / **Trigger.dev** / **QStash** (recommended with Vercel)
- Dedicated worker with Redis queue (BullMQ)

---

## Monitoring

### Application logs

| Layer | Tool | Notes |
|-------|------|-------|
| Structured logs | **Pino** → Vercel Function Logs | JSON in production; filter by `domain` field |
| Log drain | Vercel → **Axiom** / Datadog / Better Stack | Production log retention & search |
| Errors | **Sentry** (recommended) | Wrap Next.js via `@sentry/nextjs` |

Log domains: `api`, `ai`, `crawler`, `database`.

### Vercel observability

| Feature | Purpose |
|---------|---------|
| **Analytics** | Web vitals, page performance |
| **Speed Insights** | Real user metrics |
| **Function logs** | API latency, 4xx/5xx, cold starts |
| **Alerts** | Error rate spikes (Pro plan) |

### Database monitoring

| Metric | Source |
|--------|--------|
| Connection count | Neon dashboard |
| Query latency | Neon insights / `LOG_DB_QUERIES=true` (debug only) |
| Storage usage | Neon dashboard |
| Slow queries | Neon `pg_stat_statements` |

### External dependency monitoring

| Service | Monitor |
|---------|---------|
| OpenAI | Usage dashboard, rate limits, cost alerts |
| Discovery sources | HTTP error rates in `ai`/`crawler` logs |
| Search pipeline | Job status counts (`COMPLETED` vs `FAILED`) |

### Recommended alerts

- API 5xx rate > 1% (5 min window)
- Search job `FAILED` rate > 10%
- OpenAI error rate spike
- DB connections > 80% of pool limit
- Neon storage > 80% quota

---

## Backups

### Neon (recommended PostgreSQL provider)

| Feature | Plan | Retention |
|---------|------|-----------|
| **Point-in-time recovery (PITR)** | Scale+ | Up to 30 days |
| **Branch snapshots** | All | Instant copy for staging restore |
| **Automatic backups** | Managed by Neon | Continuous WAL |

### Backup policy

| Tier | Method | Frequency | Retention |
|------|--------|-----------|-----------|
| **Primary** | Neon PITR | Continuous | 7–30 days (plan dependent) |
| **Secondary** | `pg_dump` via GitHub Actions | Daily cron | 30 days (S3 / R2) |
| **Pre-migration** | Neon branch snapshot | Before each prod migration | Until manually deleted |

### Daily pg_dump workflow (optional)

```yaml
# .github/workflows/db-backup.yml (cron: 0 2 * * *)
- run: pg_dump "$DIRECT_URL" --format=custom --file=backup.dump
- run: aws s3 cp backup.dump s3://your-bucket/backups/$(date +%Y%m%d).dump
```

### Restore procedure

1. **PITR (Neon):** Restore to timestamp via Neon console → update `DATABASE_URL` if new endpoint.
2. **pg_dump:** `pg_restore --clean --if-exists -d "$DIRECT_URL" backup.dump`
3. **Verify:** `npm run db:migrate:status` + smoke test search flow.

---

## Vercel Configuration

`vercel.json` in repo root:

- **Region:** `fra1` (adjust for user base)
- **API timeout:** 60s (requires Vercel Pro for >10s)
- **Build:** `prisma generate && next build` (migrations run in CI, not build)

### Serverless limits to plan for

| Limit | Hobby | Pro |
|-------|-------|-----|
| Function timeout | 10s | 60s (configurable to 300s) |
| Bundle size | 250 MB | 250 MB |
| Concurrent executions | Limited | Higher |

Search POST returns quickly (202); orchestrator should run via `after()` or external queue.

---

## Deployment Checklist

### First production deploy

- [ ] Create Neon project + production branch
- [ ] Connect Vercel ↔ Neon integration (auto `DATABASE_URL` / `DIRECT_URL`)
- [ ] Set all required env vars in Vercel Production
- [ ] Set `API_AUTH_SECRET`, `ALLOW_DEV_UUID_AUTH=false`
- [ ] Configure GitHub Actions secrets
- [ ] Run `prisma migrate deploy` against production
- [ ] Deploy to Vercel
- [ ] Enable Neon PITR / confirm backup plan
- [ ] Configure log drain + error tracking (Sentry/Axiom)
- [ ] Deploy crawler worker (Playwright) or accept crawl-disabled mode
- [ ] Smoke test: POST `/api/v1/search` → poll GET → company detail

### Per-release

- [ ] Merge to `main` → CI migrates → Vercel deploys
- [ ] Verify `prisma migrate status` in CI logs
- [ ] Check Vercel function logs for errors
- [ ] Monitor search job completion rate for 15 min

---

## Future scaling

| Concern | Solution |
|---------|----------|
| In-memory rate limits (multi-instance) | Redis / Upstash Ratelimit |
| Playwright crawls | Dedicated worker + job queue |
| Long orchestration | Inngest / Trigger.dev |
| Read-heavy company API | Neon read replica |
| Secrets rotation | Vercel env var versioning + Neon credential rotation |
