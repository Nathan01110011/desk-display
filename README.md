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

# Optional writable personal calendar via CalDAV (Namecheap Private Email, Fastmail, etc.)
PERSONAL_CALDAV_URL=https://dav.privateemail.com
PERSONAL_CALDAV_USERNAME=you@yourdomain.com
PERSONAL_CALDAV_APP_PASSWORD=your_app_password
# Optional: use these only if automatic calendar discovery does not pick the right calendar.
PERSONAL_CALDAV_ROOT_URL=https://privateemail.com
PERSONAL_CALDAV_PRINCIPAL_URL=https://privateemail.com/path/to/principal/
PERSONAL_CALDAV_HOME_URL=https://privateemail.com/path/to/calendar-home/
PERSONAL_CALDAV_CALENDAR_NAME=Personal
PERSONAL_CALDAV_CALENDAR_URL=https://privateemail.com/path/to/calendar/

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
GOOGLE_HEALTH_REDIRECT_URI=http://localhost:3000/api/google-health/callback
# Optional dashboard goal fallbacks. Google Health v4 does not currently expose activity goals.
GOOGLE_HEALTH_STEP_GOAL=12500
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

The canonical API route names are `/api/google-health/*`. The old `/api/fitbit/*` paths still exist as compatibility aliases for existing saved dashboard config.

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
   - `http://localhost:3000/api/google-health/callback`

If you set `GOOGLE_HEALTH_REDIRECT_URI`, the value must exactly match one of the OAuth client's authorized redirect URIs.

#### Long-lived token setup
OAuth apps left in **Testing** issue offline refresh tokens that expire after about 7 days for non-basic scopes. For a long-lived dashboard token:
1. Go to **Google Auth Platform** -> **Audience**.
2. Change **Publishing status** from **Testing** to **In production** by clicking **Publish app**.
3. Restart the dashboard dev server after adding the Google env vars.
4. Visit `http://localhost:3000/api/google-health/login`.
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

The repository pins **pnpm 12.18.0** through the `packageManager` field. It supports Node.js 20+ as used by the Pi setup. Because pnpm 12 uses native binaries, use **64-bit Raspberry Pi OS (aarch64)**; 32-bit ARM is not supported. On the Pi, `uname -m` should print `aarch64`.

The lockfile is managed using the pinned pnpm version and `pnpm install --frozen-lockfile` during deployment. pnpm 12 keeps overrides and approved build scripts in `pnpm-workspace.yaml`. Keep the manifest and lockfile in sync when updating dependencies.

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

### Testing an unmerged GitHub branch on the Pi

The development deploy script uses the **existing Pi installation**. It fetches the selected branch, does a full dependency install and build, and restarts the same `dashboard` PM2 process and Chromium kiosk on **port 3000**. It preserves your existing ignored `.env.local` and `.dashboard-settings.json` files — no second copy of configuration is needed.

```bash
# From the existing desk-display directory; first time only:
git pull --ff-only origin main

# Build and run the screensaver feature branch:
./scripts/deploy-dev.sh feat/animated-clocks-flapboard

# Or omit the argument to use the current screensaver feature branch:
./scripts/deploy-dev.sh
```

To switch **back to production**, use the normal deployment command:

```bash
./scripts/deploy.sh
```

Both commands overwrite the current build in place and restart the kiosk. There is no side-by-side dev server. The normal script always selects `origin/main`, even when you've been testing a feature branch. The dev script supports another remote branch as an argument. Existing local, ignored settings and environment variables are reused in both cases.

**Caution:** Because you are running feature-branch code with production credentials, only deploy branches you trust. As with the original deploy script, uncommitted tracked source changes in the app checkout are discarded; ignored local settings and environment files are retained. A failed build can leave the kiosk unavailable until you run the normal production deployment again.

If you tested the earlier worktree-based script, its leftover `desk-display-dev` folder is not used by the new script. The new dev deployment also stops the old `dashboard-dev` PM2 process to free Pi resources.

### Preview: Portrait mode without rotating Raspberry Pi OS

The portrait UI is currently available only in the unmerged `feat/portrait-mode` branch. It is designed for the **same physical Pi touchscreen**, manually stood on an edge. Raspberry Pi OS, Labwc and the Chromium display resolution remain in landscape.

```bash
# Temporarily install the portrait branch in the existing kiosk installation:
./scripts/deploy-dev.sh feat/portrait-mode

# After reviewing, return to the current production branch:
./scripts/deploy.sh
```

In Pi Frame, open **Settings → Display → Display orientation** and choose:
- **Landscape** – unchanged default for normal horizontal placement.
- **Rotate left** – rotate Pi Frame content 90° counterclockwise.
- **Rotate right** – rotate Pi Frame content 90° clockwise.

Then physically stand the panel on whichever edge makes the picture upright. The entire application canvas, including overlays and touchscreen input, rotates with the selection. The selection persists in `.dashboard-settings.json`. The OS remains in landscape regardless of the selected Pi Frame mode.

**Recovery:** If the orientation or touch layout is inconvenient, open `http://<pi-ip>:3000/?layout=landscape` to force the app to render horizontally in that browser, then choose **Landscape** in Display settings to persist the reset. That URL override does not modify the saved orientation by itself. You can also change `displayOrientation` to `landscape` in `.dashboard-settings.json` via SSH and restart the kiosk.

Portrait uses its own dashboard arrangement with the day's calendar and upcoming events near the top, weather, and a compact app grid. Individual applications adapt to the taller layout; long content can still scroll. Landscape remains unchanged. Browser screenshots and interactions are checked at a 1280×800 landscape OS viewport and shown upright at 800×1280 in the draft pull request.

### Manual Kiosk Mode (Wayland/Labwc)
Add this to `~/.config/labwc/autostart`:
```bash
# Sleep after 3600 seconds (1 hour), wake on touch/input
swayidle -w timeout 3600 'wlopm --off *' resume 'wlopm --on *' &

# Launch Browser
/usr/bin/chromium --kiosk --disable-pinch --incognito --disable-infobars --noerrdialogs --password-store=basic --touch-events=enabled --enable-viewport --force-device-scale-factor=1 --ozone-platform=wayland http://localhost:3000 &
```

The Chromium `--disable-pinch` flag blocks browser-level pinch zoom on the Pi. The dashboard also restricts viewport zoom and uses `touch-action: pan-x pan-y` to keep regular touch scrolling available. These settings do not disable in-app buttons or chart expansion.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Parser**: ICAL.js
- **Process Manager**: PM2
