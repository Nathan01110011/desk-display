#!/bin/bash

# Exit on any error
set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="dashboard"

echo "--- 🧹 Step 1: Cleaning Environment ---"
pkill -f next || true
rm -rf "$PROJECT_DIR/.next"

echo "--- 📥 Step 2: Syncing with GitHub ---"
cd "$PROJECT_DIR"
git fetch origin
git reset --hard origin/main

echo "--- 📦 Step 3: Installing Dependencies ---"
# We need devDependencies (like TypeScript) to perform the build-time checks
npm install

echo "--- 🏗️ Step 4: Building Application (Proper Checks Enabled) ---"
# This will now have 'tsc' and '@types' available
npm run build

echo "--- 🔄 Step 5: Restarting Backend (PM2) ---"
pm2 restart $APP_NAME || pm2 start npm --name "$APP_NAME" -- start

echo "--- 🖥️ Step 6: Refreshing Kiosk Browser ---"
pkill -f chromium || true
sleep 5
/usr/bin/chromium --kiosk --incognito --disable-infobars --noerrdialogs --password-store=basic --touch-events=enabled --enable-viewport --force-device-scale-factor=1 --ozone-platform=wayland http://localhost:3000 &

echo "--- ✅ Deployment Successfully Completed ---"
