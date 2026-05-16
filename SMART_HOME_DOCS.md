# Smart Home Integration Guide

This document explains how the "Smart Home" app works in the Desk Display and how to configure it to control your devices.

## Current Support
- **TP-Link Tapo**: Supports toggling power state (ON/OFF) for smart plugs and bulbs.

## Configuration (`.env.local`)

To add devices to your dashboard, you must define the `SMART_DEVICES` environment variable. The format is a comma-separated list of devices, where each device uses a pipe (`|`) to separate its metadata:

```text
SMART_DEVICES=type|credentials|Display Name,type2|credentials2|Display Name 2
```

### Tapo Devices
For Tapo devices, the `type` is `tapo`. The credentials must include your Tapo cloud email, your Tapo cloud password, and the local IP address of the device, separated by colons (`:`).

**Format:**
`tapo|email:password:IP_ADDRESS|Name`

**Example:**
```text
SMART_DEVICES=tapo|myemail@gmail.com:MySecretPassword123:192.168.1.50|Desk Lamp,tapo|myemail@gmail.com:MySecretPassword123:192.168.1.51|Fan
```

*Note: It is highly recommended to set a "Static IP" or "DHCP Reservation" for your smart devices in your router settings so their IP addresses do not change.*

---

## Adding Support for New Vendors (For Developers)

The Smart Home app is designed to be modular. To add support for a new vendor (e.g., Phillips Hue, Kasa, Govee):

1. **Install the SDK**: Find a Node.js library for the vendor (e.g., `pnpm add node-hue-api`).
2. **Update `src/types/index.ts`**: Add the new vendor string to the `SmartDevice['type']` union (e.g., `type: 'tapo' | 'hue'`).
3. **Update the Devices API (`src/app/api/home/devices/route.ts`)**:
   - Add a new `if (type === 'hue')` block.
   - Parse the specific credentials needed for that vendor from the `.env` string.
   - Call the vendor's API to get the device status and push it to the `devices` array.
4. **Update the Toggle API (`src/app/api/home/toggle/route.ts`)**:
   - Add a corresponding `if (type === 'hue')` block.
   - Use the vendor's API to send the `targetState` (true for ON, false for OFF).
5. **Update UI (`src/components/SmartHomeView.tsx`)**:
   - (Optional) Add a custom icon from `lucide-react` for the new device type inside the render loop.
