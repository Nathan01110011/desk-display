#!/bin/bash

set +e

AUTH_PROFILE="/tmp/desk-display-spotify-auth"
AUTH_URL="http://127.0.0.1:3000/api/spotify/login"
KIOSK_URL="http://localhost:3000"

launch_kiosk() {
  sleep 1
  nohup /usr/bin/chromium \
    --kiosk \
    --incognito \
    --disable-infobars \
    --noerrdialogs \
    --password-store=basic \
    --touch-events=enabled \
    --enable-viewport \
    --force-device-scale-factor=1 \
    --ozone-platform=wayland \
    "$KIOSK_URL" >/dev/null 2>&1 &
}

cleanup() {
  if [ -n "${KEYBOARD_PID:-}" ]; then
    kill "$KEYBOARD_PID" >/dev/null 2>&1 || true
  fi

  pkill -f "$AUTH_PROFILE" >/dev/null 2>&1 || true
  rm -rf "$AUTH_PROFILE"
  launch_kiosk
}

trap cleanup EXIT INT TERM

# Let the API response reach the current kiosk before closing it.
sleep 1
pkill -f 'chromium.*--kiosk' >/dev/null 2>&1 || true
sleep 1

# Start a persistent Wayland keyboard if one is available. In Chromium app mode
# Raspberry Pi OS can also trigger its own input-method keyboard when a field is focused.
if command -v wvkbd-mobintl >/dev/null 2>&1; then
  wvkbd-mobintl >/dev/null 2>&1 &
  KEYBOARD_PID=$!
elif command -v wvkbd >/dev/null 2>&1; then
  wvkbd >/dev/null 2>&1 &
  KEYBOARD_PID=$!
elif command -v squeekboard >/dev/null 2>&1; then
  squeekboard >/dev/null 2>&1 &
  KEYBOARD_PID=$!
elif command -v onboard >/dev/null 2>&1; then
  onboard >/dev/null 2>&1 &
  KEYBOARD_PID=$!
elif command -v matchbox-keyboard >/dev/null 2>&1; then
  matchbox-keyboard >/dev/null 2>&1 &
  KEYBOARD_PID=$!
fi

rm -rf "$AUTH_PROFILE"

# Deliberately NOT kiosk/fullscreen. Under Raspberry Pi OS/Labwc the on-screen
# keyboard is layered below fullscreen Chromium, so auth must happen in app mode.
/usr/bin/chromium \
  --app="$AUTH_URL" \
  --user-data-dir="$AUTH_PROFILE" \
  --no-first-run \
  --disable-session-crashed-bubble \
  --password-store=basic \
  --touch-events=enabled \
  --enable-viewport \
  --force-device-scale-factor=1 \
  --ozone-platform=wayland \
  --window-size=900,700

exit 0
