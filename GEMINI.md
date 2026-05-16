# 📟 Gemini CLI Project Mandates

This file contains foundational instructions for Gemini CLI when working on the **Desk Display** project. These rules take precedence over general defaults.

## 🛠️ Build & Validation
- **Always Test Builds**: After making any non-trivial code changes (especially adding new libraries or changing types), you **MUST** run `pnpm build` to verify that there are no TypeScript or Next.js build errors. Never assume a change is finished until it compiles.
- **Aggressive Cleanup**: If temporary debug logs or buttons are added, ensure they are gated by `process.env.NODE_ENV === 'development'` or removed before finalizing the task.

## 🥧 Raspberry Pi Optimization
- **Wayland First**: The device uses Labwc (Wayland). Always prefer Wayland-native tools (like `swayidle`, `wlopm`, `--ozone-platform=wayland`) over X11 equivalents.
- **Touch Interaction**: Always use `onPointerDown` or `onTouchStart` for buttons to ensure instant response on the Pi's touchscreen. Avoid `onClick`.
- **Resource Management**: The Pi 4 has limited RAM. Always kill browser processes before running heavy build tasks in deployment scripts.

## 🔐 Security & Persistence
- **Ignore Local Files**: Never remove `.dashboard-settings.json` or `.calendar-cache.json` from `.gitignore`. 
- **Persist Rotated Tokens**: When implementing OAuth for rotated tokens (like Fitbit), always save the new refresh token to the local `.dashboard-settings.json` file immediately.
- **Git Safety**: The `deploy.sh` script must backup and restore `.dashboard-settings.json` before performing a `git reset --hard`.
