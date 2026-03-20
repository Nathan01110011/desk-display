#!/bin/bash

# Configuration
REPO_DIR="/home/pi/work-display"
APP_NAME="dashboard"

echo "--- 🚀 Starting Deployment ---"

# 1. Navigate to project
cd $REPO_DIR || { echo "❌ Directory not found"; exit 1; }

# 2. Pull latest code
echo "--- 📥 Pulling latest changes ---"
git pull origin main

# 3. Install dependencies (if needed)
echo "--- 📦 Installing dependencies ---"
npm install --production

# 4. Build the project
echo "--- 🏗️ Building Next.js app ---"
npm run build

# 5. Restart with PM2
echo "--- 🔄 Restarting app ---"
pm2 restart $APP_NAME --update-env || pm2 start npm --name "$APP_NAME" -- start

echo "--- ✅ Deployment Complete! ---"
