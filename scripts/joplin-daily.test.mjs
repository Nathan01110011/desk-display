import test from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_SOURCE, DAILY_TEMPLATE, creationRecord, dailyDate, dailyTitle, dayKey, hasDailyContent, isUntouchedDaily, maintainDailyNotes, selectDailyNote } from '../src/lib/joplin-daily.mjs';

const folderId = 'a'.repeat(32);
const noteIdForDay = (_folder, day) => day.replace(/-/g, '').padEnd(32, '0');
const clone = value => JSON.parse(JSON.stringify(value));

function note(day, changes = {}) {
  return {
    id: noteIdForDay(folderId, day), parent_id: folderId, title: dailyTitle(day),
    body: DAILY_TEMPLATE, source: DAILY_SOURCE, created_time: 1000, updated_time: 1000,
    user_created_time: 1000, user_updated_time: 1000, is_todo: 0, todo_due: 0,
    todo_completed: 0, markup_language: 1, deleted_time: 0, is_conflict: 0,
    encryption_applied: 0, ...changes,
  };
}

function fixture(initial = []) {
  const notes = new Map(initial.map(item => [item.id, clone(item)]));
  const writes = [];
  const saved = [];
  const state = { version: 1, folderId, lastDay: '', records: [] };
  const client = {
    getNote: async id => notes.has(id) ? clone(notes.get(id)) : null,
    listFolderNotes: async () => [...notes.values()].filter(item => !item.deleted_time).map(clone),
    createNote: async input => {
      assert.ok(!notes.has(input.id), 'duplicate creation');
      const created = note(dailyDate(input.title), input);
      notes.set(created.id, created);
      writes.push(['create', created.id]);
      return clone(created);
    },
    listNoteTags: async () => [],
    listNoteResources: async () => [],
    trashNote: async id => {
      writes.push(['trash', id]);
      notes.get(id).deleted_time = 2000;
    },
  };
  const run = (today, extra = {}) => maintainDailyNotes({
    client, folderId, today, state, noteIdForDay,
    saveState: async value => { saved.push(clone(value)); }, ...extra,
  });
  return { client, notes, writes, saved, state, run };
}

test('local date handles US midnight, DST and leap years', () => {
  assert.equal(dayKey(new Date('2026-09-15T04:59:59Z'), 'America/Chicago'), '2026-09-14');
  assert.equal(dayKey(new Date('2026-09-15T05:00:00Z'), 'America/Chicago'), '2026-09-15');
  assert.equal(dayKey(new Date('2026-03-08T07:59:59Z'), 'America/Chicago'), '2026-03-08');
  assert.equal(dayKey(new Date('2026-03-08T08:00:00Z'), 'America/Chicago'), '2026-03-08');
  assert.equal(dayKey(new Date('2026-11-01T07:00:00Z'), 'America/Chicago'), '2026-11-01');
  assert.equal(dailyDate('Daily TODO — 2028-02-29'), '2028-02-29');
  assert.equal(dailyDate('Daily TODO — 2026-02-29'), null);
  assert.equal(dailyDate('TODO 2026-09-14'), null);
});

test('daily selection ignores edit order, future dates, conflicts and Trash', () => {
  const latest = note('2026-09-14', { body: 'Current tasks' });
  const candidates = [
    note('2026-09-10', { body: 'Old edit', updated_time: 999999 }),
    note('2026-09-15', { body: 'Tomorrow' }),
    note('2026-09-14', { id: 'b'.repeat(32), body: 'Trashed', deleted_time: 3000 }),
    note('2026-09-14', { id: 'c'.repeat(32), body: 'Conflict', is_conflict: 1 }),
    latest,
  ];
  assert.equal(selectDailyNote(candidates, '2026-09-14').id, latest.id);
  assert.equal(selectDailyNote([], '2026-09-14'), null);
});

test('a fresh blank template does not hide yesterday, but today wins once edited', () => {
  const yesterday = note('2026-09-13', { body: 'Finish report' });
  const today = note('2026-09-14');
  assert.equal(selectDailyNote([today, yesterday], '2026-09-14').id, yesterday.id);
  today.body += 'Some notes';
  assert.equal(selectDailyNote([today, yesterday], '2026-09-14').id, today.id);
  assert.equal(selectDailyNote([note('2026-09-14')], '2026-09-14').title, today.title);
  assert.equal(hasDailyContent(DAILY_TEMPLATE.replace(/\n/g, '\r\n')), false);
  assert.equal(hasDailyContent(DAILY_TEMPLATE.replace('[ ]', '[x]')), true);
});

test('creation is idempotent, and only one baseline is recorded', async () => {
  const f = fixture();
  await f.run('2026-09-14');
  await f.run('2026-09-14');
  assert.equal(f.writes.length, 1);
  assert.equal(f.state.records.length, 1);
  assert.equal(f.state.lastDay, '2026-09-14');
  assert.equal(f.saved[0].records.length, 1);
});

test('untouched prior days go to Trash; notes with content remain', async () => {
  const f = fixture();
  await f.run('2026-09-12');
  await f.run('2026-09-13');
  const kept = f.notes.get(noteIdForDay(folderId, '2026-09-13'));
  kept.body += 'Keep this';
  kept.updated_time += 1;
  await f.run('2026-09-14');
  assert.ok(f.notes.get(noteIdForDay(folderId, '2026-09-12')).deleted_time);
  assert.equal(kept.deleted_time, 0);
  assert.deepEqual(f.state.records.map(item => item.day), ['2026-09-14']);
});

test('manually created or untracked matching notes are never adopted or deleted', async () => {
  const f = fixture([note('2026-09-12'), note('2026-09-13')]);
  await f.run('2026-09-13');
  await f.run('2026-09-14');
  assert.equal(f.writes.filter(item => item[0] === 'trash').length, 0);
  assert.equal(f.notes.get(noteIdForDay(folderId, '2026-09-13')).deleted_time, 0);
});

test('a manually trashed current note is not recreated', async () => {
  const f = fixture([note('2026-09-14', { deleted_time: 2000 })]);
  await f.run('2026-09-14');
  assert.equal(f.writes.length, 0);
});

test('renamed, moved, edited then cleared, checked and metadata-edited notes are preserved', async () => {
  const mutations = [
    value => { value.title = 'Keep me'; },
    value => { value.parent_id = 'b'.repeat(32); },
    value => { value.updated_time += 1; },
    value => { value.user_updated_time += 1; },
    value => { value.body = value.body.replace('[ ]', '[x]'); },
    value => { value.todo_due = 9999; },
    value => { value.source = 'manual'; },
  ];
  for (const mutate of mutations) {
    const f = fixture();
    await f.run('2026-09-13');
    const previous = f.notes.get(noteIdForDay(folderId, '2026-09-13'));
    mutate(previous);
    await f.run('2026-09-14');
    assert.equal(previous.deleted_time, 0);
  }
});

test('a tag or attachment on an otherwise blank template prevents cleanup', async () => {
  for (const method of ['listNoteTags', 'listNoteResources']) {
    const f = fixture();
    await f.run('2026-09-13');
    f.client[method] = async () => [{ id: 'resource-or-tag' }];
    await f.run('2026-09-14');
    assert.equal(f.writes.filter(item => item[0] === 'trash').length, 0);
  }
});

test('an edit during cleanup checks is detected by the final reread', async () => {
  const f = fixture();
  await f.run('2026-09-13');
  f.client.listNoteResources = async id => {
    const previous = f.notes.get(id);
    previous.body += 'Typed while cleanup was running';
    previous.updated_time += 1;
    return [];
  };
  await f.run('2026-09-14');
  assert.equal(f.writes.filter(item => item[0] === 'trash').length, 0);
});

test('an unavailable Joplin or uncertain save never triggers cleanup', async () => {
  const f = fixture();
  await f.run('2026-09-13');
  f.client.getNote = async () => { throw new Error('Offline'); };
  await assert.rejects(f.run('2026-09-14'));
  assert.equal(f.writes.filter(item => item[0] === 'trash').length, 0);
  assert.equal(f.state.lastDay, '2026-09-13');
});

test('a lost creation response is safe on retry', async () => {
  const f = fixture();
  const create = f.client.createNote;
  f.client.createNote = async input => { await create(input); throw new Error('Connection dropped'); };
  await assert.rejects(f.run('2026-09-13'));
  f.client.createNote = create;
  await f.run('2026-09-13');
  await f.run('2026-09-14');
  assert.equal(f.writes.filter(item => item[0] === 'create').length, 2);
  assert.equal(f.writes.filter(item => item[0] === 'trash').length, 0);
});

test('missed days clean up old untouched templates without creating a backlog', async () => {
  const f = fixture();
  await f.run('2026-09-01');
  await f.run('2026-09-14');
  assert.equal(f.writes.filter(item => item[0] === 'create').length, 2);
  assert.equal(f.writes.filter(item => item[0] === 'trash').length, 1);
});

test('dry run performs no Joplin or ledger writes', async () => {
  const f = fixture();
  await f.run('2026-09-13');
  f.writes.length = 0;
  f.saved.length = 0;
  const result = await f.run('2026-09-14', { dryRun: true });
  assert.deepEqual(result, { created: 1, trashed: 1, kept: 0 });
  assert.equal(f.writes.length, 0);
  assert.equal(f.saved.length, 0);
});

test('incomplete provenance or a different notebook fails closed', async () => {
  const original = note('2026-09-13');
  const record = creationRecord(original, folderId, '2026-09-13');
  assert.ok(record);
  assert.equal(isUntouchedDaily(original, record, folderId, '2026-09-13'), false);
  assert.equal(isUntouchedDaily(original, record, 'b'.repeat(32), '2026-09-14'), false);
  delete original.updated_time;
  assert.equal(creationRecord(original, folderId, '2026-09-13'), null);
  const f = fixture();
  f.state.folderId = 'b'.repeat(32);
  await assert.rejects(f.run('2026-09-14'));
  assert.equal(f.writes.length, 0);
});
