#!/bin/bash

set -u

echo "--- Raspberry Pi Kiosk Process Audit ---"
echo "Host: $(hostname 2>/dev/null || echo unknown)"
echo "Date: $(date)"
echo ""

section() {
  echo ""
  echo "--- $1 ---"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

section "System"
if have lsb_release; then
  lsb_release -ds 2>/dev/null || true
fi
uname -a
uptime

section "Memory"
free -h
if have vcgencmd; then
  echo ""
  vcgencmd measure_temp 2>/dev/null || true
  vcgencmd get_throttled 2>/dev/null || true
fi

section "Top CPU Processes"
ps -eo pid,ppid,user,comm,%cpu,%mem,etime,args --sort=-%cpu | head -25

section "Top Memory Processes"
ps -eo pid,ppid,user,comm,%mem,%cpu,etime,args --sort=-%mem | head -25

section "Kiosk-Related Processes"
pgrep -a -f 'chromium|chrome|next|node|pnpm|pm2|swayidle|wlopm|labwc|wayfire|wayland|Xorg|xwayland' || true

section "PM2"
if have pm2; then
  pm2 list
else
  echo "pm2 not found"
fi

section "Enabled System Services"
if have systemctl; then
  systemctl list-unit-files --type=service --state=enabled --no-pager
else
  echo "systemctl not found"
fi

section "Running System Services"
if have systemctl; then
  systemctl --type=service --state=running --no-pager
fi

section "User Autostart"
for file in \
  "$HOME/.config/labwc/autostart" \
  "$HOME/.config/wayfire.ini" \
  "$HOME/.config/lxsession/LXDE-pi/autostart" \
  "$HOME/.config/autostart"/*.desktop
do
  if [ -e "$file" ]; then
    echo ""
    echo "### $file"
    sed -n '1,220p' "$file"
  fi
done

section "Common Desktop Services Present"
if have systemctl; then
  for svc in \
    bluetooth.service \
    cups.service \
    cups-browsed.service \
    avahi-daemon.service \
    triggerhappy.service \
    ModemManager.service \
    NetworkManager-wait-online.service \
    ssh.service \
    vncserver-x11-serviced.service \
    wayvnc.service \
    packagekit.service
  do
    state=$(systemctl is-enabled "$svc" 2>/dev/null || echo "not-found")
    active=$(systemctl is-active "$svc" 2>/dev/null || echo "inactive")
    printf "%-34s enabled=%-10s active=%s\n" "$svc" "$state" "$active"
  done
fi

section "Possible Trim Candidates"
cat <<'INFO'
Review these manually before disabling anything:

- bluetooth.service: disable if you do not use Bluetooth keyboard/audio.
- cups.service / cups-browsed.service: disable if this kiosk never prints.
- avahi-daemon.service: disable if you do not need hostname.local discovery.
- triggerhappy.service: often unnecessary on a pure touch kiosk.
- ModemManager.service: usually unnecessary unless using cellular modems.
- NetworkManager-wait-online.service: can slow boot; usually safe to disable if app handles network later.
- packagekit.service: background package helper; often unnecessary on fixed kiosks.
- vnc/wayvnc services: disable if you do not remote into the Pi graphically.

Do not disable networking, display manager/session services, ssh, pm2, chromium, or swayidle unless you know the replacement path.
INFO

section "Example Disable Commands"
cat <<'INFO'
These are examples only. Run them one at a time after confirming from the audit:

sudo systemctl disable --now bluetooth.service
sudo systemctl disable --now cups.service cups-browsed.service
sudo systemctl disable --now avahi-daemon.service
sudo systemctl disable --now triggerhappy.service
sudo systemctl disable --now ModemManager.service
sudo systemctl disable --now NetworkManager-wait-online.service
sudo systemctl disable --now packagekit.service
INFO

echo ""
echo "--- Audit complete ---"
