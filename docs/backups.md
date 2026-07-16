# Backups & restore

[← Back to README](../README.md)

The production stack ([`docker-compose.prod.yml`](../docker-compose.prod.yml))
backs up both stores automatically:

- **Postgres** — the `db-backup` service (a maintained
  [`postgres-backup-local`](https://github.com/prodrigestivill/docker-postgres-backup-local)
  image) writes nightly compressed dumps to `./backups/postgres/` and prunes
  ones older than `BACKUP_RETENTION_DAYS` (default 14).
- **MinIO** — the `minio-backup` sidecar runs `mc mirror` on an interval
  (`BACKUP_INTERVAL_SECONDS`, default daily) into `./backups/minio/`.

> [!WARNING]
> `./backups/` lives on the **same host** as the data. It survives container
> recreation but **not disk failure**. For disk-failure resilience, enable the
> optional offsite copy below. Backups contain full user data (emails, password
> hashes, uploaded files) — they are git/docker-ignored; keep the host
> directory permissions tight (e.g. `chmod 700 backups`).

## Configuration

Set these in `.env` (all optional — sensible defaults shown):

```bash
BACKUP_RETENTION_DAYS=14      # daily Postgres dumps to keep
BACKUP_INTERVAL_SECONDS=86400 # MinIO mirror cadence (24h)
```

## Verifying backups are actually happening

A backup service that silently stopped is worse than none. The doctor script
fails if the newest dump is stale or missing:

```bash
./scripts/backup-verify.sh
# or against a real deploy path:
BACKUP_DIR=/srv/app/backups/postgres MAX_AGE_HOURS=25 ./scripts/backup-verify.sh
```

Run it from cron/monitoring and alert on a non-zero exit.

## Restore — Postgres

Dumps are compressed SQL (`pg_dump -Z6`), written under
`./backups/postgres/daily/`.

1. Pick the dump to restore:

   ```bash
   ls -t backups/postgres/daily/*.sql.gz | head
   ```

2. Restore into a **scratch** database first to validate (never straight into
   production):

   ```bash
   # create a scratch db
   docker compose -f docker-compose.prod.yml exec db \
     createdb -U postgres app_restore_test

   # load the dump
   gunzip -c backups/postgres/daily/<dump>.sql.gz | \
     docker compose -f docker-compose.prod.yml exec -T db \
     psql -U postgres -d app_restore_test
   ```

3. Sanity-check it, then confirm the schema is migration-current:

   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_restore_test \
     pnpm db:migrate   # should report "No migrations to apply"
   ```

4. To restore into the real database, stop the `app` service first, drop/recreate
   the `app` database (or restore into a fresh one and repoint `DATABASE_URL`),
   load the dump as above, then bring `app` back up.

## Restore — MinIO

The mirror is a plain directory tree under `./backups/minio/<bucket>/`. Push it
back into the bucket:

```bash
docker compose -f docker-compose.prod.yml run --rm \
  -v "$PWD/backups/minio:/backups" minio-backup \
  /bin/sh -c "mc alias set local http://minio:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD && \
    mc mirror --overwrite /backups/\$S3_BUCKET local/\$S3_BUCKET"
```

## Optional: offsite copy (disk-failure resilience)

The on-host copy doesn't survive disk loss. To also push backups to an S3-
compatible offsite target (e.g. Cloudflare R2), add an `mc` alias and mirror
step — off by default, opt-in per deployment.

> **macOS note:** Time Machine backs up `./backups` (it's a normal folder), but
> the Docker **volumes** (`pgdata`, `miniodata`) live inside Docker's Linux VM,
> which Time Machine does **not** cover. The dumps + this offsite copy are your
> real safety net — or point `./backups` at an external drive.

Provision a **least-privilege** API token (write-only to the backup bucket),
and set:

```bash
OFFSITE_BACKUP_ENDPOINT=https://<account>.r2.cloudflarestorage.com
OFFSITE_BACKUP_ACCESS_KEY=...
OFFSITE_BACKUP_SECRET_KEY=...
OFFSITE_BACKUP_BUCKET=my-app-backups
```

Then extend the `minio-backup` loop (or add a cron on the host) with:

```bash
mc alias set offsite "$OFFSITE_BACKUP_ENDPOINT" "$OFFSITE_BACKUP_ACCESS_KEY" "$OFFSITE_BACKUP_SECRET_KEY"
mc mirror --overwrite /backups "offsite/$OFFSITE_BACKUP_BUCKET"
```

## Not covered (by design)

- **Point-in-time recovery** (WAL archiving) — nightly dumps are the chosen
  fidelity; add `pgBackRest`/`wal-g` if you need sub-day RPO.
- **Backup encryption at rest** — relies on host/volume encryption; layer
  `age`/`gpg` on the dumps if required.
- **Automated restore drills in CI** — the restore above is a manual runbook
  step; run it periodically against a scratch stack.
