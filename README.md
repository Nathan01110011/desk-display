# 📟 Desk Display: Smart Kiosk Dashboard

A minimalist, high-performance smart display dashboard designed for Raspberry Pi touchscreens. Optimized for "True Dark Mode" and kiosk environments.

![v1 Dashboard](https://via.placeholder.com/1280x720/000000/FFFFFF?text=Desk+Display+v1.1)

## 🌟 Features

- **🗓️ Smart Calendar**: Live iCal feed integration with persistent caching, recurring event expansion, timezone normalization, and relative time countdowns (e.g., "in 22m").
- **🎵 Spotify Now Playing**: Real-time playback status for music and podcasts. Includes album art background (glassmorphism), smooth progress interpolation, and touch controls.
- **⏱️ Pomodoro Timer**: Built-in productivity timer with Work/Break cycles and "Done" state notifications on the dashboard.
- **🌤️ Weather App**: Current conditions and 12-hour forecast with auto-location (IP-based) and manual city overrides.
- **🌍 World Clocks**: Track up to 5 additional timezones directly on the dashboard.
- **🏠 Smart Home**: Control your smart devices (starting with TP-Link Tapo) with large, tactile toggle tiles. Supports multiple devices and vendors.
- **📝 TODO Tracker**: Embedded interactive map and checklist via an external React app, perfectly integrated via a Same-Origin proxy to bypass cross-origin restrictions.
- **⚙️ Settings Panel**: Fully configurable via an on-screen keyboard. Toggle apps, adjust timers, and exit to the OS.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 20+
- A Spotify Developer account
- A free OpenWeatherMap API key
- A private iCal URL (iCloud, Outlook, or Google)

### 2. Installation
```bash
git clone https://github.com/Nathan01110011/desk-display.git
cd desk-display
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory and fill in the following:

```text
# --- Calendar ---
ICAL_URL=https://outlook.office365.com/.../calendar.ics

# --- Spotify ---
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret
SPOTIFY_REFRESH_TOKEN=generate_via_/api/spotify/login

# --- Weather ---
OPENWEATHER_API_KEY=your_key_here

# --- Smart Home ---
# Format: type|creds|Name,type|creds|Name
# See SMART_HOME_DOCS.md for details per vendor
SMART_DEVICES=tapo|email:password:IP|Desk Lamp

# --- Sports (Dynamic Configuration) ---
# Format: sport:league_id,sport:league_id
SPORTS_LEAGUES=soccer:eng.1,soccer:sco.1,rugby:270557,football:nfl
# Comma-separated names/aliases of teams to track
SPORTS_TEAMS=Manchester United,Rangers,Ulster,Giants

# --- TODO Tracker ---
# URL to your deployed TODO map application
TODO_APP_URL=https://austin-tracker.vercel.app
```

---

## 🛠️ App Configuration Guide

### 📝 TODO Tracker
The TODO app is an embedded external React application that provides interactive maps and lists. 
- **Source Code**: Designed to work with the `todo-map-app` repository.
- **Integration**: The dashboard uses a Next.js rewrite proxy (`/todo-proxy`) to tunnel the external app. This makes it "Same-Origin," which allows the dashboard's custom on-screen keyboard to inject text directly into the iframe's DOM without triggering cross-origin security blocks.
- **Setup**: Deploy your TODO app to Vercel (or another host) and set the `TODO_APP_URL` in your `.env.local` file.

### 🎾 Sports (ESPN API)
The sports app uses the unofficial ESPN scoreboard API. 
- **Leagues**: You must provide the sport and league ID (e.g., `soccer:eng.1` for Premier League).
- **Common IDs**: `eng.1` (EPL), `sco.1` (Scottish Prem), `270557` (URC Rugby), `nfl` (NFL).
- **Filtering**: The app will only show matches if one of the team names matches a string in your `SPORTS_TEAMS` list.

### 🌤️ Weather (OpenWeatherMap)
- **API Key**: Requires a free "Current Weather" and "5 Day Forecast" key.
- **Location**: By default, it uses your public IP to guess your city. You can override this in the **Dashboard Settings** using the on-screen keyboard.

### 🎵 Spotify
- **Auth**: Visit `http://localhost:3000/api/spotify/login` once to generate your `SPOTIFY_REFRESH_TOKEN`.
- **Podcasts**: Fully supported! The UI will automatically switch to "Episode" mode when a podcast is detected.

### 🏠 Smart Home
- **Tapo**: Control your TP-Link bulbs and plugs. Requires your cloud email, password, and the device's local IP.
- **Multi-device**: Add multiple devices by separating them with a comma in your `.env.local`.
- **Docs**: See [SMART_HOME_DOCS.md](./SMART_HOME_DOCS.md) for the full configuration guide.

---

## 🥧 Raspberry Pi Deployment

### Automatic Setup
```bash
chmod +x scripts/setup-pi.sh
./scripts/setup-pi.sh
```

### Clean Deployment Script
Use the provided deploy script for one-command updates (Pulls, Builds, Restarts PM2, and Refreshes Browser):
```bash
./scripts/deploy.sh
```

### Manual Kiosk Mode (Wayland/Labwc)
Add this to `~/.config/labwc/autostart`:
```bash
# Sleep after 3600 seconds (1 hour), wake on touch/input
swayidle -w timeout 3600 'wlopm --off *' resume 'wlopm --on *' &

# Launch Browser
/usr/bin/chromium --kiosk --incognito --disable-infobars --noerrdialogs --password-store=basic --touch-events=enabled --enable-viewport --force-device-scale-factor=1 --ozone-platform=wayland http://localhost:3000 &
```

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Parser**: ICAL.js
- **Process Manager**: PM2
