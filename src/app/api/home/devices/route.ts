import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface WizPilotResponse {
  result?: {
    state?: boolean;
    dimming?: number;
    temp?: number;
    r?: number;
    g?: number;
    b?: number;
  };
}

interface SmartHomeApiDevice {
  id: string;
  type: 'wiz';
  name: string;
  isOn: boolean;
  isOffline: boolean;
  ip?: string;
  brightness?: number;
  colorTemp?: number;
  color?: { r: number; g: number; b: number };
}

async function sendWizCommand(ip: string, msg: object, retries = 2): Promise<WizPilotResponse> {
  const json = JSON.stringify(msg);
  const command = `echo '${json}' | nc -u -w 1 ${ip} 38899`;
  
  for (let i = 0; i < retries; i++) {
    try {
      const { stdout } = await execAsync(command);
      if (!stdout || stdout.trim() === '') {
        throw new Error('Empty response from bulb');
      }
      return JSON.parse(stdout) as WizPilotResponse;
    } catch (e) {
      if (i === retries - 1) throw e;
      // Small delay before retry
      await new Promise(res => setTimeout(res, 500));
    }
  }

  throw new Error('WiZ command exhausted retries');
}

export async function GET() {
  const devicesEnv = process.env.SMART_DEVICES;
  if (!devicesEnv) return NextResponse.json({ devices: [] });

  const deviceConfigs = devicesEnv.split(',');
  const allDevices: SmartHomeApiDevice[] = [];

  for (const config of deviceConfigs) {
    const [type, creds, displayName] = config.split('|');
    
    if (type === 'wiz') {
      const ip = creds;
      try {
        const response = await sendWizCommand(ip, { method: 'getPilot', params: {} });
        const result = response.result || {};
        
        allDevices.push({
          id: Buffer.from(displayName).toString('base64'),
          type: 'wiz',
          name: displayName,
          isOn: result.state ?? false,
          isOffline: false,
          ip: ip,
          brightness: result.dimming,
          colorTemp: result.temp,
          color: result.r !== undefined && result.g !== undefined && result.b !== undefined ? { r: result.r, g: result.g, b: result.b } : undefined
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        logger.error(`Smart Home: WiZ poll failed for ${displayName}: ${message}`);
        allDevices.push({
          id: Buffer.from(displayName).toString('base64'),
          type: 'wiz',
          name: displayName,
          isOn: false,
          isOffline: true
        });
      }
    }
  }

  return NextResponse.json({ devices: allDevices });
}
