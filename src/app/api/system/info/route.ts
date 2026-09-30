import { NextResponse } from 'next/server';
import os from 'os';

interface NetworkAddress {
  interface: string;
  address: string;
}

function isPrivateIpv4(address: string) {
  return address.startsWith('10.')
    || address.startsWith('192.168.')
    || /^172\.(1[6-9]|2\d|3[01])\./.test(address);
}

function interfacePriority(name: string) {
  const normalized = name.toLowerCase();
  if (normalized === 'wlan0' || normalized.startsWith('wl')) return 0;
  if (normalized === 'eth0' || normalized.startsWith('en')) return 1;
  return 2;
}

export async function GET() {
  const interfaces = os.networkInterfaces();
  const addresses: NetworkAddress[] = [];

  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      addresses.push({ interface: name, address: entry.address });
    }
  }

  addresses.sort((a, b) => {
    const aPrivate = isPrivateIpv4(a.address) ? 0 : 1;
    const bPrivate = isPrivateIpv4(b.address) ? 0 : 1;
    if (aPrivate !== bPrivate) return aPrivate - bPrivate;

    const interfaceOrder = interfacePriority(a.interface) - interfacePriority(b.interface);
    if (interfaceOrder !== 0) return interfaceOrder;

    return a.interface.localeCompare(b.interface);
  });

  const primary = addresses[0] || null;
  let username = 'pi';
  try {
    username = os.userInfo().username || username;
  } catch {
    // Keep a useful fallback if userInfo is unavailable.
  }

  return NextResponse.json({
    hostname: os.hostname(),
    username,
    primaryIp: primary?.address || null,
    primaryInterface: primary?.interface || null,
    addresses,
    sshCommand: primary ? `ssh ${username}@${primary.address}` : null,
  });
}
