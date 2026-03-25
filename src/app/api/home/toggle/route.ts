import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function sendWizCommand(ip: string, msg: object, retries = 2): Promise<any> {
  const json = JSON.stringify(msg);
  const command = `echo '${json}' | nc -u -w 1 ${ip} 38899`;
  
  for (let i = 0; i < retries; i++) {
    try {
      const { stdout } = await execAsync(command);
      if (!stdout || stdout.trim() === '') {
        throw new Error('Empty response from bulb');
      }
      return JSON.parse(stdout);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(res => setTimeout(res, 500));
    }
  }
}

export async function POST(request: Request) {
  try {
    const { id, targetState, brightness, colorTemp, color } = await request.json();
    const devicesEnv = process.env.SMART_DEVICES;
    if (!devicesEnv) return NextResponse.json({ error: 'No devices configured' }, { status: 400 });

    const deviceConfigs = devicesEnv.split(',');
    
    for (const config of deviceConfigs) {
      const [type, creds, displayName] = config.split('|');
      const configId = Buffer.from(displayName).toString('base64');
      
      if (configId === id && type === 'wiz') {
        const ip = creds;
        try {
          const params: any = {};
          if (targetState !== undefined) params.state = targetState;
          if (brightness !== undefined) params.dimming = brightness;
          if (colorTemp !== undefined) params.temp = colorTemp;
          if (color !== undefined) {
            params.r = color.r;
            params.g = color.g;
            params.b = color.b;
            delete params.temp;
          }

          await sendWizCommand(ip, {
            method: 'setPilot',
            params: params
          });
          
          return NextResponse.json({ success: true });
        } catch (e: any) {
          logger.error(`Smart Home: WiZ command failed for ${displayName}: ${e.message}`);
          return NextResponse.json({ error: 'UDP connection failed' }, { status: 503 });
        }
      }
    }

    return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  } catch (error) {
    logger.error('Smart Home Command Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
