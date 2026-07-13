#!/usr/bin/env sh
# Verify that a recent Postgres backup actually exists — not just that the
# backup service is defined. Mirrors the tunnel-verify.sh doctor pattern.
#
#   ./scripts/backup-verify.sh
#   BACKUP_DIR=/srv/app/backups/postgres MAX_AGE_HOURS=25 ./scripts/backup-verify.sh
#
# Exits 0 when the newest compressed dump is fresh and non-empty; non-zero
# otherwise. Intentionally cheap (existence + mtime + size) — a full
# restore-and-diff drill is a manual runbook step (see docs/backups.md).
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-25}"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "✗ Backup directory not found: $BACKUP_DIR" >&2
  exit 1
fi

# Newest, non-empty dump modified within the freshness window. `-mmin` is
# supported by both GNU and BSD/macOS find.
max_age_min=$((MAX_AGE_HOURS * 60))
recent=$(
  find "$BACKUP_DIR" -type f -name '*.sql.gz' -size +0c -mmin "-$max_age_min" \
    2>/dev/null | head -n 1
)

if [ -n "$recent" ]; then
  echo "✓ Recent Postgres backup found: $recent"
  exit 0
fi

# Nothing fresh — report the newest dump (if any) to aid debugging.
newest=$(ls -t "$BACKUP_DIR"/*.sql.gz "$BACKUP_DIR"/*/*.sql.gz 2>/dev/null | head -n 1 || true)
if [ -n "$newest" ]; then
  echo "✗ No backup newer than ${MAX_AGE_HOURS}h. Newest is: $newest" >&2
else
  echo "✗ No Postgres dumps (*.sql.gz) found under $BACKUP_DIR" >&2
fi
exit 1
