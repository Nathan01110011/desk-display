import { NextRequest, NextResponse } from 'next/server';

type ServiceHealthStatus = 'healthy' | 'degraded' | 'down';

interface ServiceHealthResult {
  id: string;
  name: string;
  status: ServiceHealthStatus;
  detail: string;
  latencyMs?: number;
}

interface ProbeOptions {
  id: string;
  name: string;
  path: string;
  configured?: boolean;
  unconfiguredDetail?: string;
  classify?: (response: Response, body: unknown) => Pick<ServiceHealthResult, 'status' | 'detail'>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

async function probeInternal(origin: string, options: ProbeOptions): Promise<ServiceHealthResult> {
  if (options.configured === false) {
    return {
      id: options.id,
      name: options.name,
      status: 'degraded',
      detail: options.unconfiguredDetail || 'Not configured.',
    };
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${origin}${options.path}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'x-desk-display-health-check': '1' },
    });
    const latencyMs = Date.now() - started;
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '');

    if (options.classify) {
      return { id: options.id, name: options.name, latencyMs, ...options.classify(response, body) };
    }

    if (!response.ok) {
      return {
        id: options.id,
        name: options.name,
        status: response.status >= 500 ? 'down' : 'degraded',
        detail: `HTTP ${response.status}`,
        latencyMs,
      };
    }

    const record = asRecord(body);
    if (record.error) {
      return {
        id: options.id,
        name: options.name,
        status: 'down',
        detail: String(record.diagnostic || record.error),
        latencyMs,
      };
    }

    return { id: options.id, name: options.name, status: 'healthy', detail: 'Responding normally.', latencyMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: options.id,
      name: options.name,
      status: 'down',
      detail: message.includes('aborted') ? 'Timed out after 10 seconds.' : message,
      latencyMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeTodoTracker(): Promise<ServiceHealthResult> {
  const url = process.env.TODO_APP_URL?.trim();
  if (!url) {
    return { id: 'todo', name: 'TODO Tracker', status: 'degraded', detail: 'TODO_APP_URL is not configured.' };
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, { cache: 'no-store', redirect: 'follow', signal: controller.signal });
    const latencyMs = Date.now() - started;
    if (response.ok) {
      return { id: 'todo', name: 'TODO Tracker', status: 'healthy', detail: 'External app is reachable.', latencyMs };
    }
    return {
      id: 'todo',
      name: 'TODO Tracker',
      status: response.status >= 500 ? 'down' : 'degraded',
      detail: `External app returned HTTP ${response.status}.`,
      latencyMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: 'todo',
      name: 'TODO Tracker',
      status: 'down',
      detail: message.includes('aborted') ? 'Timed out after 10 seconds.' : message,
      latencyMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  const checks = await Promise.all([
    probeInternal(origin, {
      id: 'weather',
      name: 'Weather',
      path: '/api/weather',
      configured: Boolean(process.env.OPENWEATHER_API_KEY && process.env.OPENWEATHER_API_KEY !== 'your_key_here'),
      unconfiguredDetail: 'OpenWeather API key is not configured; app is using mock data.',
      classify: (response, body) => {
        if (!response.ok) return { status: 'down', detail: `HTTP ${response.status}` };
        const location = String(asRecord(body).location || '');
        if (location.includes('(Mock)')) return { status: 'degraded', detail: 'Using mock weather data.' };
        if (location.includes('(Offline)')) return { status: 'degraded', detail: 'OpenWeather failed; using offline fallback data.' };
        return { status: 'healthy', detail: location ? `OpenWeather responding for ${location}.` : 'OpenWeather responding.' };
      },
    }),
    probeInternal(origin, {
      id: 'spotify',
      name: 'Spotify',
      path: '/api/spotify/now-playing',
      configured: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
      unconfiguredDetail: 'Spotify client credentials are not configured.',
      classify: (response, body) => {
        const record = asRecord(body);
        if (record.authRequired) return { status: 'down', detail: String(record.error || 'Spotify authorization required.') };
        if (!response.ok || record.error) return { status: 'down', detail: String(record.diagnostic || record.error || `HTTP ${response.status}`) };
        return { status: 'healthy', detail: record.title ? `Authorized · ${String(record.title)}` : 'Authorized and responding.' };
      },
    }),
    probeInternal(origin, {
      id: 'work-calendar',
      name: 'Work Calendar',
      path: '/api/calendar?range=today',
      configured: Boolean(process.env.ICAL_URL),
      unconfiguredDetail: 'ICAL_URL is not configured.',
      classify: (response, body) => {
        if (!response.ok) return { status: 'down', detail: `HTTP ${response.status}` };
        if (!Array.isArray(body)) return { status: 'degraded', detail: 'Calendar endpoint returned an unexpected response.' };
        return { status: 'healthy', detail: `Calendar feed responding · ${body.length} upcoming today.` };
      },
    }),
    probeInternal(origin, {
      id: 'personal-calendar',
      name: 'Email / CalDAV',
      path: '/api/personal-calendar',
      configured: Boolean(process.env.PERSONAL_CALDAV_URL && process.env.PERSONAL_CALDAV_USERNAME && process.env.PERSONAL_CALDAV_APP_PASSWORD),
      unconfiguredDetail: 'Personal email/CalDAV credentials are not configured.',
      classify: (response, body) => {
        if (!response.ok) return { status: 'down', detail: `HTTP ${response.status}` };
        if (!Array.isArray(body)) return { status: 'degraded', detail: 'CalDAV endpoint returned an unexpected response.' };
        return { status: 'healthy', detail: `CalDAV endpoint responding · ${body.length} events loaded.` };
      },
    }),
    probeInternal(origin, {
      id: 'google-health',
      name: 'Google Health',
      path: '/api/google-health/stats',
      configured: Boolean(process.env.GOOGLE_HEALTH_CLIENT_ID && process.env.GOOGLE_HEALTH_CLIENT_SECRET),
      unconfiguredDetail: 'Google Health OAuth credentials are not configured.',
      classify: (response, body) => {
        const record = asRecord(body);
        if (!response.ok || record.error) return { status: 'down', detail: String(record.error || `HTTP ${response.status}`) };
        return { status: 'healthy', detail: 'Google Health API responding.' };
      },
    }),
    probeInternal(origin, {
      id: 'smart-home',
      name: 'Smart Home',
      path: '/api/home/devices',
      configured: Boolean(process.env.SMART_DEVICES),
      unconfiguredDetail: 'No SMART_DEVICES are configured.',
      classify: (response, body) => {
        if (!response.ok) return { status: 'down', detail: `HTTP ${response.status}` };
        const devices = asRecord(body).devices;
        if (!Array.isArray(devices)) return { status: 'degraded', detail: 'Device endpoint returned an unexpected response.' };
        const offline = devices.filter((item) => Boolean(asRecord(item).isOffline)).length;
        if (offline > 0) return { status: 'degraded', detail: `${offline} of ${devices.length} configured devices offline.` };
        return { status: 'healthy', detail: `${devices.length} configured devices responding.` };
      },
    }),
    probeInternal(origin, {
      id: 'sports',
      name: 'Sports / ESPN',
      path: '/api/sports',
      classify: (response, body) => {
        if (!response.ok) return { status: response.status >= 500 ? 'down' : 'degraded', detail: `HTTP ${response.status}` };
        if (!Array.isArray(body)) return { status: 'degraded', detail: 'Sports endpoint returned an unexpected response.' };
        return { status: 'healthy', detail: `ESPN data responding · ${body.length} matches loaded.` };
      },
    }),
    probeTodoTracker(),
  ]);

  const overall: ServiceHealthStatus = checks.some((check) => check.status === 'down')
    ? 'down'
    : checks.some((check) => check.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  return NextResponse.json({
    overall,
    checkedAt: new Date().toISOString(),
    services: checks,
  });
}
