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
- **❤️ Google Health**: Daily steps, floors, calories, active minutes, and resting heart rate via the Google Health API.
- **📝 TODO Tracker**: Embedded interactive map and checklist via an external React app, perfectly integrated via a Same-Origin proxy to bypass cross-origin restrictions.
- **⚙️ Settings Panel**: Fully configurable via an on-screen keyboard. Toggle apps, adjust timers, and exit to the OS.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 20+
- pnpm via Corepack
- A Spotify Developer account
- A free OpenWeatherMap API key
- A Google Cloud project with the Google Health API enabled
- A private iCal URL (iCloud, Outlook, or Google)

### 2. Installation
```bash
git clone https://github.com/Nathan01110011/desk-display.git
cd desk-display
corepack enable pnpm
pnpm install
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

# --- Google Health ---
# Used by the Health dashboard app. See setup notes below.
GOOGLE_HEALTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_HEALTH_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_HEALTH_REFRESH_TOKEN=your_google_health_refresh_token
# Optional. Must exactly match an authorized redirect URI in Google Cloud if set.
GOOGLE_HEALTH_REDIRECT_URI=http://localhost:3000/api/fitbit/callback
# Optional dashboard goals.
GOOGLE_HEALTH_STEP_GOAL=10000
GOOGLE_HEALTH_FLOOR_GOAL=10

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

### ❤️ Google Health
The Health dashboard app uses the Google Health API, which replaces the old Fitbit Web API integration. It reads today's activity and health summary data:
- Steps
- Floors
- Total calories
- Moderate + vigorous active minutes
- Daily resting heart rate, when available

The internal route names are still `/api/fitbit/*` for compatibility with existing saved dashboard config, but the visible app is labelled **Health**.

#### Google Cloud setup
1. Open [Google Cloud Console](https://console.cloud.google.com/) and select the project you want to use.
2. Enable the **Google Health API** for that project.
3. Go to **Google Auth Platform**.
4. Configure **Branding**, **Audience**, and **Data Access**.
5. In **Data Access**, add these scopes:
   - `https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly`
   - `https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly`
   - `https://www.googleapis.com/auth/googlehealth.sleep.readonly`
6. Create an OAuth client under **Clients** / **Credentials**. Use a web application client.
7. Add this authorized redirect URI:
   - `http://localhost:3000/api/fitbit/callback`

If you set `GOOGLE_HEALTH_REDIRECT_URI`, the value must exactly match one of the OAuth client's authorized redirect URIs.

#### Long-lived token setup
OAuth apps left in **Testing** issue offline refresh tokens that expire after about 7 days for non-basic scopes. For a long-lived dashboard token:
1. Go to **Google Auth Platform** -> **Audience**.
2. Change **Publishing status** from **Testing** to **In production** by clicking **Publish app**.
3. Restart the dashboard dev server after adding the Google env vars.
4. Visit `http://localhost:3000/api/fitbit/login`.
5. Approve the Health scopes.
6. The callback saves the refresh token to `.dashboard-settings.json` as `googleHealthRefreshToken` and also displays a `GOOGLE_HEALTH_REFRESH_TOKEN=...` line that you can place in `.env.local`.

For the actual Raspberry Pi/device, copy the same `GOOGLE_HEALTH_CLIENT_ID`, `GOOGLE_HEALTH_CLIENT_SECRET`, and `GOOGLE_HEALTH_REFRESH_TOKEN` into that device's `.env.local`, then restart the app. Google refresh tokens do not normally rotate on use, so the same token can be used by the desktop test environment and device. The token can still stop working if access is revoked, the OAuth app changes scopes, the app stays in Testing, or the token is unused for a long period.

Service account keys such as `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` are not used for Google Health personal data. Health data belongs to a Google user account and requires user OAuth consent.

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
