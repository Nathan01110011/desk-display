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

echo "--- 📥 Step 2: Syncing with GitHub ---"
cd "$PROJECT_DIR"
git fetch origin
git reset --hard origin/main

echo "--- 📦 Step 3: Installing Dependencies ---"
npm install

echo "--- 🏗️ Step 4: Building Application ---"
npm run build

echo "--- 🔄 Step 5: Restarting Backend (PM2) ---"
pm2 restart $APP_NAME || pm2 start npm --name "$APP_NAME" -- start

echo "--- 🖥️ Step 6: Refreshing Kiosk Browser ---"
sleep 5
# Launch with nohup and redirect ALL output to ensure total detachment
nohup /usr/bin/chromium --kiosk --incognito --disable-infobars --noerrdialogs --password-store=basic --touch-events=enabled --enable-viewport --force-device-scale-factor=1 --ozone-platform=wayland http://localhost:3000 > /dev/null 2>&1 &

echo "--- ✅ Deployment Successfully Completed ---"
exit 0
