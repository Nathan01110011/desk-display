#!/bin/bash

# Configuration
TARGET_DIR=$(pwd)

echo "--- 🥧 Raspberry Pi Setup Script ---"

# 1. Update and install basic tools
echo "--- 🛠️ Updating system tools ---"
sudo apt update && sudo apt install -y git chromium swayidle wlopm

# 2. Install Node.js (if not already present)
if ! command -v node &> /dev/null
then
    echo "--- 🟢 Installing Node.js ---"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 3. Enable pnpm and install PM2 globally
echo "--- 📦 Enabling pnpm ---"
corepack enable pnpm

echo "--- 🟢 Installing PM2 ---"
pnpm add --global pm2
pm2 startup | tail -n 1 | bash # Set PM2 to start on boot

# 4. Initial Build & Start
echo "--- 🏗️ Initial Build and Start ---"
cd $TARGET_DIR
pnpm install --frozen-lockfile
pnpm build
pm2 start pnpm --name "dashboard" -- start
pm2 save # Save current process list for boot

echo ""
echo "--- 🖥️ KIOSK & POWER SETUP (Wayland/Labwc) ---"
echo "Add these lines to: ~/.config/labwc/autostart"
echo ""
echo "# 1. Force Full Brightness on Start"
echo "echo 31 > /sys/class/backlight/10-0045/brightness"
echo ""
echo "# 2. Screen Sleep (1 hour inactivity, wake on touch/input)"
echo "swayidle -w timeout 3600 'echo 0 > /sys/class/backlight/10-0045/brightness' resume 'echo 31 > /sys/class/backlight/10-0045/brightness' &"
echo ""
echo "# 2. Launch Browser"
echo "chromium --kiosk --incognito --disable-infobars --noerrdialogs --password-store=basic --touch-events=enabled --enable-viewport --force-device-scale-factor=1 --ozone-platform=wayland http://localhost:3000 &"
echo ""
echo "--- ✅ Setup finished! ---"
