#!/usr/bin/env bash
# Boot persistence for a self-hosted Mac (mini) — see docs/self-hosting.md.
#
# Installs a launchd LaunchAgent that, at login, waits for the Docker engine
# and then brings the tunnel stack up. Containers use `restart: unless-stopped`,
# so once the engine is running they self-heal; this agent covers the reboot
# case where nothing would otherwise start the stack.
#
#   ./scripts/macos-autostart.sh install [make-target]   # default: tunnel-up
#   ./scripts/macos-autostart.sh uninstall
#   ./scripts/macos-autostart.sh status
#   ./scripts/macos-autostart.sh boot <target>           # used by the plist
#
# For a fully unattended reboot you also need:
#   1. Auto-login (System Settings → Users & Groups → Automatically log in) —
#      LaunchAgents run at login, and Docker Desktop needs a GUI session.
#      (OrbStack/Colima are friendlier for headless boxes.)
#   2. Your container runtime set to start at login (Docker Desktop/OrbStack
#      setting).
#   3. No sleep:  sudo pmset -a sleep 0 disablesleep 1 womp 1
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_NAME="$(basename "$ROOT_DIR")"
LABEL="com.${REPO_NAME}.autostart"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG="$HOME/Library/Logs/${LABEL}.log"

# launchd runs jobs with a bare PATH (/usr/bin:/bin) that omits Homebrew — where
# `docker` usually lives on macOS. Prepend the common locations so the engine
# resolves whether we're invoked from a shell or from launchd. (The installed
# plist also bakes in the operator's PATH; this covers a hand-loaded plist too.)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

usage() { sed -n '2,21p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

# Readiness probe for the container engine. Uses `docker version` rather than
# `docker info` — the latter hangs indefinitely on some Podman machines, which
# would stall boot. `docker version` checks the same thing (server reachable)
# and returns fast.
engine_ready() { docker version --format '{{.Server.Version}}' >/dev/null 2>&1; }

install_agent() {
  local target="${1:-tunnel-up}"
  case "$target" in
    tunnel-up|deploy) ;;
    *) echo "✗ target must be 'tunnel-up' or 'deploy' (got '$target')" >&2; exit 2 ;;
  esac
  mkdir -p "$(dirname "$PLIST")"
  cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${SCRIPT_DIR}/macos-autostart.sh</string>
    <string>boot</string>
    <string>${target}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>${PATH}</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>${LOG}</string>
  <key>StandardErrorPath</key><string>${LOG}</string>
</dict>
</plist>
EOF
  launchctl unload "$PLIST" >/dev/null 2>&1 || true
  launchctl load "$PLIST"
  echo "✓ Installed LaunchAgent ${LABEL} (runs 'make ${target}' at login)"
  echo "  plist: $PLIST"
  echo "  logs:  $LOG"
  echo ""
  echo "For unattended reboots, also:"
  echo "  • enable auto-login + start your Docker runtime at login"
  echo "  • sudo pmset -a sleep 0 disablesleep 1 womp 1"
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

# Runs from the plist at login: wait for the Docker engine, then start the stack.
boot_stack() {
  local target="${1:-tunnel-up}"
  cd "$ROOT_DIR"
  echo "[autostart] $(date) waiting for Docker engine…"
  for _ in $(seq 1 60); do
    engine_ready && break
    sleep 5
  done
  engine_ready || { echo "[autostart] Docker engine never came up — is the runtime set to start at login?"; exit 1; }
  echo "[autostart] Docker up — running make ${target}"
  make "$target"
}

case "${1:-}" in
  install)   install_agent "${2:-}" ;;
  uninstall) uninstall_agent ;;
  status)    status_agent ;;
  boot)      boot_stack "${2:-}" ;;
  -h|--help|'') usage ;;
  *) echo "Unknown command '${1}'" >&2; usage >&2; exit 2 ;;
esac
