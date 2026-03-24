import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { loginDeviceByIp } from 'tp-link-tapo-connect';

export async function POST(request: Request) {
  try {
    const { id, targetState } = await request.json();
    
    const devicesEnv = process.env.SMART_DEVICES;
    if (!devicesEnv) return NextResponse.json({ error: 'No devices configured' }, { status: 400 });

    const deviceConfigs = devicesEnv.split(',');
    
    for (const config of deviceConfigs) {
      const [type, creds, name] = config.split('|');
      const configId = Buffer.from(name).toString('base64');
      
      if (configId === id) {
        if (type === 'tapo') {
          const [email, password, ip] = creds.split(':');
          const device = await loginDeviceByIp(email, password, ip);
          if (targetState) {
            await device.turnOn();
          } else {
            await device.turnOff();
          }
          
          logger.info(`Smart Home: Turned ${name} ${targetState ? 'ON' : 'OFF'}`);
          return NextResponse.json({ success: true, isOn: targetState });
        }
      }
    }

    return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  } catch (error) {
    logger.error('Smart Home Toggle Error:', error);
    return NextResponse.json({ error: 'Failed to toggle device' }, { status: 500 });
  }
}
