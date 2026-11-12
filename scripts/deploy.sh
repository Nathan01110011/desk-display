#!/bin/bash

# Exit on any error
set -e

# By default always deploy main. The dev wrapper opts in to a specific remote branch.
DEPLOY_BRANCH="main"
if [[ $# -gt 0 ]]; then
  if [[ $# -ne 2 || "$1" != "--branch" ]]; then
    echo "Usage: $0 [--branch <remote-branch>]" >&2
    exit 2
  fi
  DEPLOY_BRANCH="$2"
fi
if ! git check-ref-format --branch "$DEPLOY_BRANCH" >/dev/null 2>&1; then
  echo "Invalid deployment branch: $DEPLOY_BRANCH" >&2
  exit 2
fi

# pnpm 12 ships native Linux arm64 builds but not 32-bit ARM binaries.
# Refuse before stopping the kiosk so failed migrations leave it usable.
case "$(uname -m)" in
  armv6l|armv7l|armv8l|armhf)
    echo "pnpm 12.18.0 requires a 64-bit Raspberry Pi OS (aarch64). This system is $(uname -m)." >&2
    exit 1
    ;;
esac

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="dashboard"

echo "--- 📥 Step 1: Fetching origin/$DEPLOY_BRANCH ---"
cd "$PROJECT_DIR"
git fetch origin
if ! git show-ref --verify --quiet "refs/remotes/origin/$DEPLOY_BRANCH"; then
  echo "Remote branch origin/$DEPLOY_BRANCH does not exist; current dashboard is untouched." >&2
  exit 1
fi

echo "--- 🧰 Step 2: Checking build tools ---"
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not available on PATH."
  echo "Run ./scripts/setup-pi.sh once, or install pnpm with: sudo corepack enable pnpm"
  exit 1
fi

echo "--- 🧹 Step 2.5: Freeing RAM for the full build ---"
# Stop the legacy isolated preview process, if one exists, to avoid competing Pi builds.
if [[ "$DEPLOY_BRANCH" != "main" ]] && pm2 describe dashboard-dev >/dev/null 2>&1; then
  pm2 delete dashboard-dev || true
fi
pkill -9 -f chromium || true
pkill -9 -f next || true
killall -9 chromium 2>/dev/null || true
sleep 2
rm -rf "$PROJECT_DIR/.next"

echo "--- 🌿 Step 2.6: Selecting origin/$DEPLOY_BRANCH ---"
# The existing ignored .env.local and .dashboard-settings.json remain in place.
# Use a detached remote commit for dev so the local main branch is never moved.
if [[ "$DEPLOY_BRANCH" == "main" ]]; then
  git switch --force main
  git reset --hard origin/main
else
  git switch --force --detach "origin/$DEPLOY_BRANCH"
fi

echo "--- 📦 Step 3: Installing Dependencies ---"
pnpm install --frozen-lockfile

echo "--- 🏗️ Step 4: Building Application ---"
pnpm build

echo "--- 🔄 Step 5: Restarting Backend (PM2) ---"
pm2 restart "$APP_NAME" || pm2 start "$(command -v pnpm)" --name "$APP_NAME" -- start

echo "--- 🖥️ Step 6: Refreshing Kiosk Browser ---"
sleep 5
# Launch with nohup and redirect ALL output to ensure total detachment
nohup /usr/bin/chromium --kiosk --disable-pinch --incognito --disable-infobars --noerrdialogs --password-store=basic --touch-events=enabled --enable-viewport --force-device-scale-factor=1 --ozone-platform=wayland http://localhost:3000 > /dev/null 2>&1 &

echo "--- ✅ Deployment Successfully Completed ($DEPLOY_BRANCH, port 3000) ---"
exit 0
