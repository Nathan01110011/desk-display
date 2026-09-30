#!/bin/bash

# find-wiz-bulbs.sh - Find WiZ smart bulbs on the local network.
#
# Usage:
#   ./scripts/find-wiz-bulbs.sh
#   ./scripts/find-wiz-bulbs.sh 192.168.1
#   BULB_NAME="Office Desk Lamp" ./scripts/find-wiz-bulbs.sh

set -u

BULB_NAME="${BULB_NAME:-Office Desk Lamp}"
SUBNET="${1:-}"
PORT=38899
REQUEST='{"method":"getPilot","params":{}}'
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/wiz-scan.XXXXXX")"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

detect_local_ip() {
  if command -v ipconfig >/dev/null 2>&1; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
    return
  fi

  if command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | awk '{print $1}'
  fi
}

if [ -z "$SUBNET" ]; then
  LOCAL_IP="$(detect_local_ip)"

  if [ -z "$LOCAL_IP" ]; then
    echo "Error: Could not detect local IP. Pass the subnet manually, e.g. ./scripts/find-wiz-bulbs.sh 192.168.1"
    exit 1
  fi

  SUBNET="$(echo "$LOCAL_IP" | cut -d'.' -f1-3)"
else
  LOCAL_IP="$(detect_local_ip)"
fi

if ! command -v nc >/dev/null 2>&1; then
  echo "Error: netcat (nc) is required."
  exit 1
fi

echo "--- WiZ Bulb Discovery ---"
if [ -n "${LOCAL_IP:-}" ]; then
  echo "Local IP: $LOCAL_IP"
fi
echo "Scanning subnet: $SUBNET.0/24"
echo "Probe: UDP $PORT getPilot"
echo ""

for i in {1..254}; do
  (
    IP="$SUBNET.$i"
    OUT_FILE="$TMP_DIR/$i.out"

    RESPONSE="$(printf '%s' "$REQUEST" | nc -u -w 1 "$IP" "$PORT" 2>/dev/null || true)"

    if echo "$RESPONSE" | grep -q '"result"'; then
      printf '%s\n' "$RESPONSE" > "$OUT_FILE"
      echo "Found WiZ bulb at $IP"
    fi
  ) &
done

wait

echo ""
FOUND=0
for OUT_FILE in "$TMP_DIR"/*.out; do
  [ -e "$OUT_FILE" ] || continue
  FOUND=1
  HOST_PART="$(basename "$OUT_FILE" .out)"
  IP="$SUBNET.$HOST_PART"

  echo "IP: $IP"
  echo "Response: $(cat "$OUT_FILE")"
  echo "Env: SMART_DEVICES=wiz|$IP|$BULB_NAME"
  echo ""
done

if [ "$FOUND" -eq 0 ]; then
  echo "No WiZ bulbs responded."
  echo "Check that the bulb is powered on, on the same Wi-Fi network, and not isolated by guest Wi-Fi/client isolation."
  exit 1
fi
