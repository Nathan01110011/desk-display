# 📟 Smart Kiosk Dashboard

A minimalist, high-performance smart display dashboard designed for Raspberry Pi touchscreens. Optimized for "True Dark Mode" and kiosk environments.

![v1 Dashboard](https://via.placeholder.com/1280x720/000000/FFFFFF?text=Smart+Kiosk+Dashboard+v1)

## 🌟 Features

- **🗓️ Smart Calendar**: Live iCal feed integration with persistent caching, recurring event expansion, and automatic "Today Only" filtering.
- **🎵 Spotify Now Playing**: Real-time playback status with album art background (glassmorphism), progress interpolation (smooth 10fps movement), and touch controls (Play/Pause/Skip).
- **⏱️ Pomodoro Timer**: Built-in productivity timer with Work/Break cycles and large, touch-friendly display.
- **🌑 True Dark Mode**: Locked at `#000000` to blend perfectly with screen bezels.
- **🥧 Pi Optimized**: Purpose-built for 1280x720 resolution with large kiosk-grade typography.

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 20+
- Spotify Developer Account (for API credentials)
- Private iCal URL (iCloud, Google, etc.)

### 2. Installation
```bash
git clone https://github.com/Nathan01110011/desk-display.git
cd desk-display
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```text
ICAL_URL=your_private_ical_url
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
SPOTIFY_REFRESH_TOKEN=
```

### 4. Spotify Authentication
To generate your first refresh token:
1. Visit `http://localhost:3000/api/spotify/login` in your browser.
2. Authorize the app.
3. Copy the token into your `.env.local`.

### 5. Development
```bash
npm run dev
```

## 🥧 Raspberry Pi Deployment

### Automatic Setup
We provide a script to handle Node.js installation, PM2 setup, and kiosk configuration:
```bash
chmod +x scripts/setup-pi.sh
./scripts/setup-pi.sh
```

### Manual Kiosk Mode (Wayland/Labwc)
Add the following to `~/.config/labwc/autostart`:
```bash
# Wait for backend
sleep 15
# Launch Chromium
chromium --kiosk --incognito --disable-infobars --noerrdialogs --password-store=basic --touch-events=enabled --enable-viewport --force-device-scale-factor=1 --ozone-platform=wayland http://localhost:3000 &
```

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Parser**: ICAL.js
- **Process Manager**: PM2

---
Built with ❤️ for the Raspberry Pi community.
