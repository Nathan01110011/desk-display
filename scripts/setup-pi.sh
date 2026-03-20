#!/bin/bash

# Configuration
TARGET_DIR=$(pwd)

echo "--- 🥧 Raspberry Pi Setup Script ---"

# 1. Update and install basic tools
echo "--- 🛠️ Updating system tools ---"
sudo apt update && sudo apt install -y git chromium

# 2. Install Node.js (if not already present)
if ! command -v node &> /dev/null
then
    echo "--- 🟢 Installing Node.js ---"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 3. Install PM2 globally
echo "--- 🟢 Installing PM2 ---"
sudo npm install -g pm2
pm2 startup | tail -n 1 | bash # Set PM2 to start on boot

# 4. Initial Build & Start
echo "--- 🏗️ Initial Build and Start ---"
cd $TARGET_DIR
npm install
npm run build
pm2 start npm --name "dashboard" -- start
pm2 save # Save current process list for boot

echo ""
echo "--- 🖥️ KIOSK MODE SETUP INSTRUCTIONS ---"
echo "To make the dashboard open in full-screen on boot, add the following to your autostart file:"
echo "Location: /etc/xdg/lxsession/rpd-x/autostart (or /etc/xdg/lxsession/LXDE-pi/autostart)"
echo ""
echo "@chromium --kiosk --incognito --disable-infobars --noerrdialogs --password-store=basic --touch-events=enabled --enable-viewport http://localhost:3000"
echo ""
echo "--- ✅ Setup finished! ---"
