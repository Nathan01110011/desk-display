#!/bin/bash

# find-pi.sh - A generic tool to find Raspberry Pis on the local network
USER="${1:-$(whoami)}"

# 1. Detect local IP and Subnet (macOS specific)
LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
if [ -z "$LOCAL_IP" ]; then
    echo "❌ Error: Could not detect local IP. Are you connected to Wi-Fi?"
    exit 1
fi

# Get the first three octets (e.g., 192.168.4)
SUBNET=$(echo "$LOCAL_IP" | cut -d'.' -f1-3)

echo "📡 Local IP: $LOCAL_IP"
echo "🔍 Scanning subnet: $SUBNET.0/24 for SSH (Port 22)..."
echo "💡 This may take 20-30 seconds. Press Ctrl+C to stop."

# 2. Fast scan using netcat in the background for speed
# We use a loop and & to check all 254 IPs in parallel
for i in {1..254}; do
    (
        ip="$SUBNET.$i"
        if [ "$ip" == "$LOCAL_IP" ]; then exit; fi
        
        # Check if port 22 is open with a 1s timeout
        if nc -z -G 1 "$ip" 22 2>/dev/null; then
            echo -e "\n⚡ SSH OPEN at $ip! Trying login as $USER..."
            # Try to login. This will prompt for a password naturally.
            if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$USER@$ip" exit; then
                echo "✅ SUCCESS! Found Pi at $ip"
                # We can't easily exit the whole script from a subshell, 
                # but this will stop the noise.
                kill $PPID 
            fi
        fi
    ) &
done

# Wait for background jobs to finish
wait
echo -e "\n⚠️ Scan complete."
