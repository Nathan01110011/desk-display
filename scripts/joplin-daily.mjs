import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createJoplinClient, JoplinError, resolveDailyFolder } from '../src/lib/joplin-client.mjs';
import { dayKey, maintainDailyNotes } from '../src/lib/joplin-daily.mjs';

const args = new Set(process.argv.slice(2));
if ([...args].some(arg => !['--watch', '--dry-run'].includes(arg)) || (args.has('--watch') && args.has('--dry-run'))) {
  console.error('Usage: node --env-file=.env.local scripts/joplin-daily.mjs [--watch | --dry-run]');
  process.exit(1);
}

const directory = path.join(process.cwd(), '.data', 'joplin-daily');
const statePath = path.join(directory, 'state.json');
const lockPath = path.join(directory, 'worker.lock');
const lockToken = randomUUID();
let ownsLock = false;
let stopping = false;
const stopSignal = new AbortController();
const stop = () => { stopping = true; stopSignal.abort(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

async function acquireLock() {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    const lock = await open(lockPath, 'wx', 0o600);
    ownsLock = true;
    try {
      await lock.writeFile(JSON.stringify({ pid: process.pid, token: lockToken }));
    } finally {
      await lock.close();
    }
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const previousText = await readFile(lockPath, 'utf8');
    const previous = JSON.parse(previousText);
    if (!Number.isInteger(previous.pid) || previous.pid <= 0) throw new Error('Invalid daily worker lock.');
    try {
      process.kill(previous.pid, 0);
    } catch (probeError) {
      if (probeError.code === 'ESRCH' && await readFile(lockPath, 'utf8') === previousText) {
        await unlink(lockPath);
        return acquireLock();
      }
      throw new Error('Could not verify the daily worker lock.');
    }
    throw new Error('A daily TODO worker is already running.');
  }
}

async function loadState() {
  try {
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    if (state.version !== 1 || !Array.isArray(state.records) ||
        state.records.some(record => !record.snapshot || typeof record.day !== 'string')) {
      throw new Error('Invalid daily TODO state.');
    }
    return state;
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, records: [], folderId: '', lastDay: '' };
    // Do not reset a damaged ledger and risk adopting old notes.
    throw error;
  }
}

async function saveState(state) {
  const temporary = statePath + '.' + lockToken + '.tmp';
  await writeFile(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
  await rename(temporary, statePath);
}

function noteIdForDay(folderId, day) {
  return createHash('sha256').update('desk-display.daily-todo.v1:' + folderId + ':' + day).digest('hex').slice(0, 32);
}

try {
  const client = createJoplinClient({ baseUrl: process.env.JOPLIN_API_URL, token: process.env.JOPLIN_API_TOKEN });
  const timeZone = process.env.JOPLIN_TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
  dayKey(new Date(), timeZone); // Validate before any writes.
  await acquireLock();
  const state = await loadState();
  do {
    try {
      const today = dayKey(new Date(), timeZone);
      if (state.lastDay !== today || args.has('--dry-run')) {
        const folder = await resolveDailyFolder(client, {
          id: process.env.JOPLIN_DAILY_NOTEBOOK_ID || state.folderId,
          create: !args.has('--dry-run'),
        });
        if (!folder) {
          console.info('Dry run: would create Daily TODO notebook and today\'s note.');
        } else {
          const result = await maintainDailyNotes({
            client, folderId: folder.id, today, state, saveState, noteIdForDay,
            dryRun: args.has('--dry-run'),
          });
          console.info((args.has('--dry-run') ? 'Dry run ' : '') + today + ': ' +
            result.created + ' created, ' + result.trashed + ' moved to Trash, ' + result.kept + ' kept.');
        }
      }
    } catch (error) {
      if (!args.has('--watch')) throw error;
      console.error(error instanceof JoplinError ? error.message : 'Daily TODO maintenance failed; will retry.');
    }
    if (!args.has('--watch') || stopping) break;
    try {
      await delay(60000, undefined, { signal: stopSignal.signal });
    } catch (error) {
      if (error.name !== 'AbortError') throw error;
    }
  } while (!stopping);
} catch (error) {
  console.error(error instanceof JoplinError ? error.message : 'Daily TODO worker could not complete. Check its configuration and private state.');
  process.exitCode = 1;
} finally {
  if (ownsLock) {
    try {
      const lock = JSON.parse(await readFile(lockPath, 'utf8'));
      if (lock.token === lockToken) await unlink(lockPath);
    } catch {
      console.error('Could not release the daily TODO worker lock.');
    }
  }
}
