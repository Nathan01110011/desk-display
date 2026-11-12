#!/usr/bin/env bash
# Deploy an isolated preview of a GitHub branch without touching the Pi's production dashboard.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
DEV_DIR="${PI_FRAME_DEV_DIR:-$(dirname "$PROJECT_DIR")/$(basename "$PROJECT_DIR")-dev}"
DEV_PORT="${PI_FRAME_DEV_PORT:-3001}"
DEV_APP="dashboard-dev"

usage() {
  cat <<'HELP'
Usage:
  ./scripts/deploy-dev.sh <branch> [--kiosk]
  ./scripts/deploy-dev.sh --production-kiosk
  ./scripts/deploy-dev.sh --stop

Deploys an isolated Git worktree on port 3001 (override with PI_FRAME_DEV_PORT).
The normal production dashboard on port 3000 is left running.

Examples:
  ./scripts/deploy-dev.sh feat/animated-clocks-flapboard
  ./scripts/deploy-dev.sh feat/animated-clocks-flapboard --kiosk
  ./scripts/deploy-dev.sh --production-kiosk

--kiosk switches the Pi's on-screen Chromium to the dev preview.
--production-kiosk switches the Pi's on-screen Chromium back to port 3000.
--stop stops the development PM2 process (leaves the worktree in place).
HELP
}

switch_kiosk() {
  local url="$1"
  if [[ ! -x /usr/bin/chromium ]]; then
    echo "Cannot switch kiosk: /usr/bin/chromium is missing." >&2
    return 1
  fi
  # Explicit opt-in only: a kiosk switch closes existing Chromium windows.
  pkill -x chromium 2>/dev/null || true
  pkill -x chromium-browser 2>/dev/null || true
  sleep 1
  nohup /usr/bin/chromium \
    --kiosk --disable-pinch --incognito --disable-infobars --noerrdialogs \
    --password-store=basic --touch-events=enabled --enable-viewport \
    --force-device-scale-factor=1 --ozone-platform=wayland \
    "$url" >/dev/null 2>&1 </dev/null &
  echo "Kiosk is pointing to $url"
}

case "${1:-}" in
  --help|-h|'') usage; exit 0 ;;
  --production-kiosk) switch_kiosk 'http://localhost:3000'; exit $? ;;
  --stop)
    if ! command -v pm2 >/dev/null 2>&1; then echo 'PM2 is not installed.' >&2; exit 1; fi
    pm2 delete "$DEV_APP" 2>/dev/null || true
    echo 'Stopped dashboard-dev; production was not changed.'
    exit 0
    ;;
esac

BRANCH="$1"
shift
KIOSK=false
if [[ $# -gt 0 ]]; then
  if [[ $# -eq 1 && "$1" == '--kiosk' ]]; then KIOSK=true; else usage >&2; exit 2; fi
fi

if ! git check-ref-format --branch "$BRANCH" >/dev/null 2>&1; then
  echo "Invalid Git branch name: $BRANCH" >&2
  exit 2
fi
if [[ ! "$DEV_PORT" =~ ^[0-9]+$ ]] || (( DEV_PORT < 1024 || DEV_PORT > 65535 || DEV_PORT == 3000 )); then
  echo "Invalid preview port: $DEV_PORT (must be 1024-65535, and not 3000)" >&2
  exit 2
fi
for command_name in git pnpm pm2 node; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done
case "$(uname -m)" in
  armv6l|armv7l|armv8l|armhf)
    echo 'pnpm 12.18.0 requires 64-bit Raspberry Pi OS (aarch64).' >&2
    exit 1
    ;;
esac

cd "$PROJECT_DIR"
if [[ "$(git rev-parse --show-toplevel)" != "$PROJECT_DIR" ]]; then
  echo "Expected a Git repo at $PROJECT_DIR." >&2
  exit 1
fi
if [[ "$(realpath -m "$DEV_DIR")" == "$PROJECT_DIR" ]]; then
  echo 'Development worktree must not be the production directory.' >&2
  exit 1
fi

# Only fetch a ref; never reset/checkout the production working tree.
echo "Fetching origin/$BRANCH..."
git fetch origin "refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
TARGET_SHA="$(git rev-parse "refs/remotes/origin/$BRANCH^{commit}")"

if [[ -e "$DEV_DIR" ]]; then
  if [[ ! -d "$DEV_DIR" ]] || ! git -C "$DEV_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Refusing to overwrite non-worktree directory: $DEV_DIR" >&2
    exit 1
  fi
  BASE_GIT="$(git rev-parse --path-format=absolute --git-common-dir)"
  DEV_GIT="$(git -C "$DEV_DIR" rev-parse --path-format=absolute --git-common-dir)"
  if [[ "$(realpath -m "$BASE_GIT")" != "$(realpath -m "$DEV_GIT")" ]] || [[ "$(git -C "$DEV_DIR" rev-parse --show-toplevel)" != "$(realpath -m "$DEV_DIR")" ]]; then
    echo "Refusing to overwrite unrelated Git directory: $DEV_DIR" >&2
    exit 1
  fi
  if [[ -n "$(git -C "$DEV_DIR" status --porcelain --untracked-files=no)" ]]; then
    echo "There are uncommitted tracked changes in $DEV_DIR; commit or stash them first." >&2
    exit 1
  fi
  git -C "$DEV_DIR" switch --detach "$TARGET_SHA"
else
  git worktree add --detach "$DEV_DIR" "$TARGET_SHA"
fi

# Seed the preview with ONLY configured World Clocks and screensaver preferences.
# Avoid copying production secrets, auth tokens, or .env.local into unreviewed branches.
node - "$PROJECT_DIR/.dashboard-settings.json" "$DEV_DIR/.dashboard-settings.json" <<'NODE'
const fs = require('node:fs');
const [from, to] = process.argv.slice(2);
const load = path => {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); } catch { return {}; }
};
const main = load(from);
const existing = load(to);
const options = ['screensaverType', 'analogClockTheme', 'analogShowWorldClocks', 'flapboardMode', 'flapboardAnimation', 'flapboardInterval'];
const settings = {
  worldClocks: Array.isArray(main.worldClocks) ? main.worldClocks : [],
  ruleLockOnOpen: false,
  ruleLockOnInactivity: false,
  screensaverType: 'analog',
};
for (const option of options) {
  if (existing[option] !== undefined) settings[option] = existing[option];
}
fs.writeFileSync(to, JSON.stringify(settings, null, 2), { mode: 0o600 });
fs.chmodSync(to, 0o600);
NODE

echo "Preparing isolated preview: $DEV_DIR"
cd "$DEV_DIR"
pnpm install --frozen-lockfile
pnpm build

# Start the preview only after a successful build; leave the production PM2 process alone.
if pm2 describe "$DEV_APP" >/dev/null 2>&1; then
  pm2 delete "$DEV_APP"
fi
pm2 start "$(command -v pnpm)" --name "$DEV_APP" --cwd "$DEV_DIR" -- start --port "$DEV_PORT"
echo "Preview branch: $BRANCH ($TARGET_SHA)"
echo "Preview address: http://localhost:$DEV_PORT"
echo "Production remains on http://localhost:3000"
echo 'No secrets are copied to the preview. Only World Clocks settings are imported.'
if [[ "$KIOSK" == true ]]; then
  switch_kiosk "http://localhost:$DEV_PORT"
else
  echo "To switch the on-screen kiosk to the preview, rerun with --kiosk."
  echo "To switch the kiosk back to production later: ./scripts/deploy-dev.sh --production-kiosk"
fi
