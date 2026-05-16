#!/bin/bash

# Exit on any error
set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="dashboard"

echo "--- 🧹 Step 1: Cleaning Environment & Freeing RAM ---"
# Force kill browser and any hanging next processes
pkill -9 -f chromium || true
pkill -9 -f next || true
killall -9 chromium 2>/dev/null || true
# Give the system a moment to reclaim memory
sleep 2
rm -rf "$PROJECT_DIR/.next"

echo "--- 🧰 Step 1.5: Ensuring pnpm is available ---"
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not available on PATH."
  echo "Run ./scripts/setup-pi.sh once, or install pnpm with: sudo corepack enable pnpm"
  exit 1
fi

echo "--- 📥 Step 2: Syncing with GitHub ---"
cd "$PROJECT_DIR"
# Backup settings if they exist to prevent git reset from deleting rotated tokens
[ -f .dashboard-settings.json ] && cp .dashboard-settings.json /tmp/dashboard-settings.json.bak
git fetch origin
git reset --hard origin/main
# Restore settings
[ -f /tmp/dashboard-settings.json.bak ] && mv /tmp/dashboard-settings.json.bak .dashboard-settings.json

echo "--- 📦 Step 3: Installing Dependencies ---"
pnpm install --frozen-lockfile

echo "--- 🏗️ Step 4: Building Application ---"
pnpm build

echo "--- 🔄 Step 5: Restarting Backend (PM2) ---"
pm2 restart "$APP_NAME" || pm2 start "$(command -v pnpm)" --name "$APP_NAME" -- start

echo "--- 🖥️ Step 6: Refreshing Kiosk Browser ---"
sleep 5
# Launch with nohup and redirect ALL output to ensure total detachment
nohup /usr/bin/chromium --kiosk --incognito --disable-infobars --noerrdialogs --password-store=basic --touch-events=enabled --enable-viewport --force-device-scale-factor=1 --ozone-platform=wayland http://localhost:3000 > /dev/null 2>&1 &

echo "--- ✅ Deployment Successfully Completed ---"
exit 0
