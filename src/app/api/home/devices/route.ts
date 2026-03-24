import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { loginDeviceByIp } from 'tp-link-tapo-connect';

export async function GET() {
  const devicesEnv = process.env.SMART_DEVICES;
  if (!devicesEnv) {
    return NextResponse.json({ devices: [] });
  }

  const deviceConfigs = devicesEnv.split(',');
  const devices = [];

  for (const config of deviceConfigs) {
    const [type, creds, name] = config.split('|');
    
    if (type === 'tapo') {
      const [email, password, ip] = creds.split(':');
      try {
        const device = await loginDeviceByIp(email, password, ip);
        const info = await device.getDeviceInfo();
        
        devices.push({
          id: Buffer.from(name).toString('base64'),
          type: 'tapo',
          name,
          isOn: info.device_on
        });
      } catch (e) {
        logger.error(`Failed to fetch status for Tapo device: ${name}`, e);
        devices.push({
          id: Buffer.from(name).toString('base64'),
          type: 'tapo',
          name,
          isOn: false,
        });
      }
    }
  }

  return NextResponse.json({ devices });
}
