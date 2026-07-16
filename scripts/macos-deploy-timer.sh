#!/usr/bin/env bash
# Pull-based continuous deployment (Tier B) for a self-hosted Mac — the
# recommended path for PUBLIC repos, since it needs no self-hosted GitHub Actions
# runner (nothing from GitHub ever executes on the box). See docs/self-hosting.md.
#
# Installs a launchd LaunchAgent that, on an interval, pulls the latest published
# image from GHCR and runs `make deploy` (migrate → recreate app behind the
# tunnel). The box reaches OUT to the registry; no inbound port, no runner.
#
#   ./scripts/macos-deploy-timer.sh install [interval-seconds]  # default: 60
#   ./scripts/macos-deploy-timer.sh uninstall
#   ./scripts/macos-deploy-timer.sh status
#   ./scripts/macos-deploy-timer.sh tick                        # used by the plist
#
# The operator's .env (APP_IMAGE / APP_TAG + tunnel vars) is kept OFF the
# checkout at ~/.config/<repo>/.env (override with DEPLOY_ENV_FILE); each tick
# copies it in, because `docker compose` reads ./.env from the project dir.
#
# Each tick is cheap: it pulls only the app image's manifest and compares its
# digest to the last-deployed one. If unchanged it exits immediately — so a short
# interval (default 60s) gets a new release live within ~a minute without doing a
# full pull+migrate+recreate on every idle tick.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_NAME="$(basename "$ROOT_DIR")"
LABEL="com.${REPO_NAME}.deploy-timer"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG="$HOME/Library/Logs/${LABEL}.log"
ENV_SRC="${DEPLOY_ENV_FILE:-$HOME/.config/${REPO_NAME}/.env}"
# Records the image ID last deployed, so an unchanged tick is a fast no-op.
STATE_FILE="$HOME/.config/${REPO_NAME}/.last-deployed-image"

# launchd runs jobs with a bare PATH (/usr/bin:/bin) that omits Homebrew — where
# `docker` usually lives on macOS. Prepend the common locations so the engine
# resolves whether we're invoked from a shell or from launchd. (The installed
# plist also bakes in the operator's PATH; this covers a hand-loaded plist too.)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

usage() { sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

# Readiness probe for the container engine. Uses `docker version` rather than
# `docker info` — the latter hangs indefinitely on some Podman machines (it
# queries full system state), which would wedge every tick before `make deploy`.
# `docker version` checks the same thing (server reachable) and returns fast.
engine_ready() { docker version --format '{{.Server.Version}}' >/dev/null 2>&1; }

install_agent() {
  local interval="${1:-60}"
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
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>${PATH}</string>
  </dict>
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

# Read a single KEY from the staged .env, stripping optional surrounding quotes.
env_value() {
  grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//'
}

# One deploy cycle: refresh the checkout, stage the operator .env, then deploy —
# but only when the published app image has actually changed since last time.
tick() {
  cd "$ROOT_DIR"
  echo "[deploy-timer] $(date) starting check"
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
  for _ in $(seq 1 60); do engine_ready && break; sleep 5; done
  engine_ready || { echo "[deploy-timer] Docker engine not available — is the runtime set to start at login?" >&2; exit 1; }

  # Cheap change-detection: refresh only the app image's manifest and compare its
  # ID to the last deploy. `app` and `migrate` are re-tagged in lockstep per
  # release, so the app digest is a reliable signal for "something to deploy".
  local app_image app_tag ref new_id old_id
  app_image="$(env_value APP_IMAGE)"
  app_tag="$(env_value APP_TAG)"; app_tag="${app_tag:-latest}"
  if [ -n "$app_image" ]; then
    ref="${app_image}:${app_tag}"
    docker pull "$ref" >/dev/null 2>&1 || echo "[deploy-timer] could not refresh $ref — proceeding to full deploy"
    new_id="$(docker image inspect "$ref" --format '{{.Id}}' 2>/dev/null || true)"
    old_id="$(cat "$STATE_FILE" 2>/dev/null || true)"
    if [ -n "$new_id" ] && [ "$new_id" = "$old_id" ]; then
      echo "[deploy-timer] up to date ($app_tag @ ${new_id#sha256:}) — nothing to deploy"
      echo "[deploy-timer] $(date) done"
      return 0
    fi
    echo "[deploy-timer] change detected ($app_tag) — deploying"
  fi

  make deploy
  if [ -n "${new_id:-}" ]; then
    mkdir -p "$(dirname "$STATE_FILE")"
    printf '%s\n' "$new_id" >"$STATE_FILE"
  fi
  echo "[deploy-timer] $(date) done"
}

case "${1:-}" in
  install)   install_agent "${2:-60}" ;;
  uninstall) uninstall_agent ;;
  status)    status_agent ;;
  tick)      tick ;;
  -h|--help|'') usage ;;
  *) echo "Unknown command '${1}'" >&2; usage >&2; exit 2 ;;
esac
