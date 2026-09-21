export const DAILY_SOURCE = 'desk-display/daily-todo/v1';
export const DAILY_TEMPLATE = '## Tasks\n\n- [ ] \n\n## Notes\n';

export function dayKey(now = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = type => parts.find(item => item.type === type)?.value;
  return part('year') + '-' + part('month') + '-' + part('day');
}

export function dailyTitle(day) {
  return 'Daily TODO — ' + day;
}

export function dailyDate(title) {
  const match = /^Daily TODO — (\d{4}-\d{2}-\d{2})$/.exec(title);
  if (!match) return null;
  const parsed = new Date(match[1] + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === match[1] ? match[1] : null;
}

export function isVisibleNote(note) {
  return Boolean(note && !note.deleted_time && !note.is_conflict && !note.encryption_applied);
}

export function hasDailyContent(body) {
  const normalized = body.replace(/\r\n/g, '\n').trim();
  return normalized !== '' && normalized !== DAILY_TEMPLATE.trim();
}

/** Prefer the newest dated note with content, then the newest empty daily note. Never show future days. */
export function selectDailyNote(notes, today) {
  const candidates = notes.filter(note => {
    const day = dailyDate(note.title);
    return isVisibleNote(note) && day && day <= today;
  }).sort((left, right) => right.title.localeCompare(left.title) || left.id.localeCompare(right.id));
  return candidates.find(note => hasDailyContent(note.body)) ?? candidates[0] ?? null;
}

const SNAPSHOT_FIELDS = [
  'id', 'parent_id', 'title', 'body', 'created_time', 'updated_time',
  'user_created_time', 'user_updated_time', 'source', 'is_todo',
  'todo_due', 'todo_completed', 'markup_language', 'deleted_time', 'is_conflict', 'encryption_applied',
];

/** Only a POST response can establish the untouched baseline; never adopt an existing note for cleanup. */
export function creationRecord(note, folderId, day) {
  if (!note || note.parent_id !== folderId || note.title !== dailyTitle(day) ||
      note.body !== DAILY_TEMPLATE || note.source !== DAILY_SOURCE ||
      SNAPSHOT_FIELDS.some(field => note[field] === undefined) ||
      !Number.isFinite(note.updated_time) || note.updated_time <= 0) return null;
  return { day, snapshot: Object.fromEntries(SNAPSHOT_FIELDS.map(field => [field, note[field]])) };
}

export function isUntouchedDaily(note, record, folderId, today) {
  const original = record.snapshot;
  return Boolean(
    isVisibleNote(note) && original && dailyDate(original.title) === record.day &&
    record.day < today && original.parent_id === folderId &&
    original.source === DAILY_SOURCE &&
    typeof original.body === 'string' && original.updated_time > 0 &&
    SNAPSHOT_FIELDS.every(field => original[field] !== undefined && note[field] === original[field])
  );
}

/**
 * State is private to one worker. saveState must persist atomically.
 * Check the live note twice before cleanup; edited notes leave the cleanup ledger permanently.
 */
export async function maintainDailyNotes({ client, folderId, today, state, saveState, noteIdForDay, dryRun = false }) {
  if (state.version !== 1 || !Array.isArray(state.records) ||
      (state.folderId && state.folderId !== folderId)) throw new Error('Daily TODO state does not match this notebook.');
  const result = { created: 0, trashed: 0, kept: 0 };
  state.folderId = folderId;
  const id = noteIdForDay(folderId, today);
  const existing = await client.getNote(id);
  const notes = await client.listFolderNotes(folderId);
  // Includes a known note in Trash: deleting today's generated note is respected.
  if (!existing && !notes.some(note => dailyDate(note.title) === today && isVisibleNote(note))) {
    result.created = 1;
    if (!dryRun) {
      const created = await client.createNote({
        id, parent_id: folderId, title: dailyTitle(today), body: DAILY_TEMPLATE,
        source: DAILY_SOURCE, is_todo: 0, markup_language: 1,
      });
      let record = creationRecord(created, folderId, today);
      if (!record && created.updated_time > 0) {
        const full = await client.getNote(created.id);
        // Some Joplin versions omit default fields in POST responses. Fill those only
        // if the fetched note still has the exact creation content and timestamps.
        if (full && ['title', 'body', 'source', 'updated_time', 'user_updated_time'].every(field => full[field] === created[field])) {
          record = creationRecord(full, folderId, today);
        }
      }
      if (record) state.records.push(record);
      // Persist immediately. If the POST succeeded but its response/state save was lost,
      // the deterministic ID prevents duplicates and the untracked note is kept.
      await saveState(state);
    }
  }

  for (const record of [...state.records]) {
    if (record.day >= today) continue;
    const note = await client.getNote(record.snapshot.id);
    let untouched = isUntouchedDaily(note, record, folderId, today);
    if (untouched) {
      const tags = await client.listNoteTags(note.id);
      const resources = await client.listNoteResources(note.id);
      untouched = tags.length === 0 && resources.length === 0;
      if (untouched) untouched = isUntouchedDaily(await client.getNote(note.id), record, folderId, today);
    }
    if (untouched) {
      result.trashed += 1;
      if (!dryRun) await client.trashNote(record.snapshot.id);
    } else {
      result.kept += 1;
    }
    if (!dryRun) {
      state.records = state.records.filter(item => item !== record);
      await saveState(state);
    }
  }
  if (!dryRun) {
    state.lastDay = today;
    await saveState(state);
  }
  return result;
}
