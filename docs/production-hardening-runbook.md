# Goalix Production Hardening Runbook

This runbook keeps the current product behavior, roles, permissions, and workflows intact. The only intentional user-flow change is MFA enforcement for admins and coaches.

## Deployment Target

- Target: Docker on a VPS or VM.
- Entry point: `docker-compose.prod.yml`.
- Public edge: `nginx` load balances `api-1` and `api-2`.
- Background processing: `worker-1` and `worker-2` run BullMQ outside the API process.
- Realtime: Socket.IO uses sticky load balancing plus the Redis adapter, so events can move between API instances.

Required production environment:

- `NODE_ENV=production`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_ACTIVE_KID`
- `COOKIE_SECRET`
- `TOTP_ENCRYPTION_KEY`
- `CSRF_SECRET`
- `MFA_ENFORCED_ROLES=admin,coach`

Recommended database/runtime guards:

- Put PgBouncer or managed connection pooling between API instances and PostgreSQL before scaling beyond one API instance.
- Keep `DB_POOL_MAX` small per API process, usually `8-12`, and scale API instances horizontally through the load balancer.
- `DB_APPLICATION_NAME=goalix-api`
- `DB_STATEMENT_TIMEOUT_MS=30000`
- `DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS=10000`
- `DB_LOCK_TIMEOUT_MS=5000`

Background automations:

- In production, keep `BULLMQ_WORKERS_ENABLED=false` in API containers.
- Prefer enabling `BACKGROUND_AUTOMATIONS_ENABLED=true` and `INJURY_RISK_AUTOMATION_ENABLED=true` on worker containers only.
- Automations use Redis locks, so duplicate worker/API instances should not run the same scheduled task at the same time.
- `NOTIFICATION_CLEANUP_ENABLED=true` keeps old notification data pruned according to `NOTIFICATION_RETENTION_MONTHS`.

For S3-compatible upload storage:

- `STORAGE_PROVIDER=s3`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- Optional: `S3_ENDPOINT`, `S3_REGION`

## Health Checks

- `GET /health` is lightweight and only confirms the process is alive.
- `GET /ready` checks PostgreSQL and Redis.
- PostgreSQL failure returns HTTP 503.
- Redis failure returns HTTP 200 with `status=degraded` because Redis/cache/queue should not take down normal API browsing.

## Backups and Disaster Recovery

Default targets:

- RPO: 15 minutes.
- RTO: 2 hours.

PostgreSQL:

- Enable WAL archiving or a managed equivalent.
- Run encrypted full backups at least daily.
- Retain point-in-time recovery logs according to academy data retention requirements.
- Store backups outside the VPS.

Redis:

- Enable AOF for queue/realtime resilience.
- Back up the Redis volume or managed Redis snapshots.

Monthly restore drill:

1. Restore the latest encrypted PostgreSQL backup to a clean database.
2. Restore Redis AOF or start with an empty Redis if queues can be replayed safely.
3. Run backend migrations.
4. Run smoke tests for login, player profile, rankings, chat, notifications, and uploads.
5. Record restore duration and compare it against the 2 hour RTO.

## SQL Dumps

Do not use production SQL dumps directly in development or handover.

Use:

```bash
cd golx-backend
node scripts/sanitize-sql-dump.js ../private/prod.sql ../private/prod.sanitized.sql
```

The sanitizer masks emails, phone numbers, password hashes, TOTP secrets, tokens, addresses, and common name columns in plain SQL and `COPY ... FROM stdin` dumps. For highly sensitive handover work, prefer restoring into an isolated database and exporting a purpose-built anonymized dataset.

Before committing:

```bash
npm run security:scan-dumps
```

## Secret Rotation

JWT rotation:

1. Generate a new `JWT_SECRET` and set a new `JWT_ACTIVE_KID`.
2. Move the old active secret into `JWT_SECRET_PREVIOUS`.
3. Deploy.
4. Wait longer than `JWT_ACCESS_EXPIRY`.
5. Remove `JWT_SECRET_PREVIOUS`.

Refresh token rotation follows the same process with `JWT_REFRESH_SECRET_PREVIOUS`, but wait longer than `JWT_REFRESH_EXPIRY`.

TOTP:

- `TOTP_ENCRYPTION_KEY` must remain stable while encrypted TOTP secrets exist.
- Rotate it with a controlled re-encryption job, not by replacing the env var directly.

## Upload Storage

Chat images and assignment files go through the storage adapter:

- Development default: local `golx-backend/uploads`.
- Production: S3-compatible bucket via `STORAGE_PROVIDER=s3`.

Files are served through `/uploads/...` so permission checks remain enforced. Do not expose the bucket directly. Archive old objects with bucket lifecycle policies, but keep links resolvable through the app unless a product data-retention decision explicitly says otherwise.

## Authorization Hardening

Sensitive access checks should go through `src/shared/access-policy.js` and deny by default. Access denials for parent visibility, chat, attachments, and AI surfaces should write structured audit rows when possible.

## Realtime Safety

Chat writes are DB-first. Important events are recorded in `realtime_outbox` with:

- `id` as `eventId`
- `sequence`
- `event_type`
- `entity_type`
- `entity_id`
- `occurred_at`

Clients should dedupe socket events by `eventId`. Message send retries can pass `clientMessageId` to receive the same existing message instead of creating duplicates.
