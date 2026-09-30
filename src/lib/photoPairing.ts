import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SESSION_DURATION_MS = 10 * 60 * 1000;
const SESSION_PATH = path.join(process.cwd(), 'data', '.photo-pairing.json');

async function readSessions(): Promise<Record<string, number>> {
  try {
    return JSON.parse(await readFile(SESSION_PATH, 'utf8')) as Record<string, number>;
  } catch {
    return {};
  }
}

async function writeSessions(sessions: Record<string, number>) {
  await mkdir(path.dirname(SESSION_PATH), { recursive: true });
  await writeFile(SESSION_PATH, JSON.stringify(sessions));
}

function removeExpiredSessions(sessions: Record<string, number>) {
  const now = Date.now();
  return Object.fromEntries(Object.entries(sessions).filter(([, expiresAt]) => expiresAt > now));
}

export async function createPhotoPairingSession() {
  const sessions = removeExpiredSessions(await readSessions());
  const token = randomBytes(24).toString('base64url');
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  sessions[token] = expiresAt;
  await writeSessions(sessions);
  return { token, expiresAt };
}

export async function validatePhotoPairingToken(token: string | null) {
  if (!token) return false;
  const sessions = removeExpiredSessions(await readSessions());
  const expiresAt = sessions[token];
  if (!expiresAt || expiresAt <= Date.now()) {
    delete sessions[token];
    await writeSessions(sessions);
    return false;
  }
  return true;
}

export async function endPhotoPairingSession(token: string | null) {
  if (!token) return;
  const sessions = removeExpiredSessions(await readSessions());
  delete sessions[token];
  await writeSessions(sessions);
}
