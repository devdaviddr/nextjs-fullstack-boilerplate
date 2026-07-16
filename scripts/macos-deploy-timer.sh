#!/usr/bin/env bash
# Pull-based continuous deployment (Tier B) for a self-hosted Mac — the
# recommended path for PUBLIC repos, since it needs no self-hosted GitHub Actions
# runner (nothing from GitHub ever executes on the box). See docs/self-hosting.md.
#
# Installs a launchd LaunchAgent that, on an interval, pulls the latest published
# image from GHCR and runs `make deploy` (migrate → recreate app behind the
# tunnel). The box reaches OUT to the registry; no inbound port, no runner.
#
#   ./scripts/macos-deploy-timer.sh install [interval-seconds]  # default: 300
#   ./scripts/macos-deploy-timer.sh uninstall
#   ./scripts/macos-deploy-timer.sh status
#   ./scripts/macos-deploy-timer.sh tick                        # used by the plist
#
# The operator's .env (APP_IMAGE / APP_TAG + tunnel vars) is kept OFF the
# checkout at ~/.config/<repo>/.env (override with DEPLOY_ENV_FILE); each tick
# copies it in, because `docker compose` reads ./.env from the project dir.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_NAME="$(basename "$ROOT_DIR")"
LABEL="com.${REPO_NAME}.deploy-timer"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG="$HOME/Library/Logs/${LABEL}.log"
ENV_SRC="${DEPLOY_ENV_FILE:-$HOME/.config/${REPO_NAME}/.env}"

usage() { sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

install_agent() {
  local interval="${1:-300}"
  case "$interval" in
    ''|*[!0-9]*) echo "✗ interval must be a positive integer (seconds), got '$interval'" >&2; exit 2 ;;
  esac
  [ "$interval" -ge 60 ] || { echo "✗ interval must be ≥ 60 seconds" >&2; exit 2; }
  mkdir -p "$(dirname "$PLIST")"
  cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${SCRIPT_DIR}/macos-deploy-timer.sh</string>
    <string>tick</string>
  </array>
  <key>StartInterval</key><integer>${interval}</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>${LOG}</string>
  <key>StandardErrorPath</key><string>${LOG}</string>
</dict>
</plist>
EOF
  launchctl unload "$PLIST" >/dev/null 2>&1 || true
  launchctl load "$PLIST"
  echo "✓ Installed LaunchAgent ${LABEL} (runs 'make deploy' every ${interval}s)"
  echo "  plist: $PLIST"
  echo "  logs:  $LOG"
  echo "  env:   $ENV_SRC  (must exist — APP_IMAGE / APP_TAG + tunnel vars)"
}

uninstall_agent() {
  launchctl unload "$PLIST" >/dev/null 2>&1 || true
  rm -f "$PLIST"
  echo "✓ Removed ${LABEL}"
}

status_agent() {
  if [ -f "$PLIST" ]; then
    echo "installed: $PLIST"
    launchctl list | grep -F "$LABEL" || echo "(not loaded — run: launchctl load \"$PLIST\")"
  else
    echo "not installed"
  fi
}

# One deploy cycle: refresh the checkout, stage the operator .env, pull + deploy.
tick() {
  cd "$ROOT_DIR"
  echo "[deploy-timer] $(date) starting pull cycle"
  # Keep compose files / Makefile current, but never let a pull block a deploy.
  if [ -d "$ROOT_DIR/.git" ]; then
    git pull --ff-only >/dev/null 2>&1 || echo "[deploy-timer] git pull skipped/failed — using current checkout"
  fi
  if [ ! -f "$ENV_SRC" ]; then
    echo "[deploy-timer] ✗ $ENV_SRC not found — create it (see docs/self-hosting.md → Tier B)" >&2
    exit 1
  fi
  install -m 600 "$ENV_SRC" .env
  # The box may have just booted — wait for the engine before pulling.
  for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 5; done
  docker info >/dev/null 2>&1 || { echo "[deploy-timer] Docker engine not available — is the runtime set to start at login?" >&2; exit 1; }
  make deploy
  echo "[deploy-timer] $(date) done"
}

case "${1:-}" in
  install)   install_agent "${2:-300}" ;;
  uninstall) uninstall_agent ;;
  status)    status_agent ;;
  tick)      tick ;;
  -h|--help|'') usage ;;
  *) echo "Unknown command '${1}'" >&2; usage >&2; exit 2 ;;
esac
