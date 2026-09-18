import test from 'node:test';
import assert from 'node:assert/strict';
import { createJoplinClient, resolveDailyFolder } from '../src/lib/joplin-client.mjs';

const id = 'a'.repeat(32);

test('transport paginates, authenticates privately, and disables caching/redirects', async () => {
  const seen = [];
  const client = createJoplinClient({
    token: 'test-secret',
    fetchImpl: async (url, options) => {
      seen.push({ url, options });
      return Response.json({ items: [{ id }], has_more: url.searchParams.get('page') === '1' });
    },
  });
  assert.equal((await client.listFolderNotes(id)).length, 2);
  assert.equal(seen[1].url.searchParams.get('page'), '2');
  assert.equal(seen[0].url.searchParams.get('token'), 'test-secret');
  assert.equal(seen[0].options.cache, 'no-store');
  assert.equal(seen[0].options.redirect, 'error');
  assert.equal(seen[0].options.method, 'GET');
});

test('trash uses DELETE without permanent deletion; missing IDs are handled', async () => {
  const seen = [];
  const client = createJoplinClient({
    token: 'test-secret',
    fetchImpl: async (url, options) => {
      seen.push({ url, options });
      return new Response(null, { status: options.method === 'DELETE' ? 204 : 404 });
    },
  });
  assert.equal(await client.getNote(id), null);
  await client.trashNote(id);
  assert.equal(seen[1].options.method, 'DELETE');
  assert.equal(seen[1].url.searchParams.has('permanent'), false);
});

test('upstream bodies, credentials and URLs do not appear in errors', async () => {
  const client = createJoplinClient({
    token: 'sensitive-token',
    fetchImpl: async () => new Response('sensitive-token PRIVATE NOTE', { status: 403 }),
  });
  await assert.rejects(client.getNote(id), error => !/sensitive|PRIVATE/.test(error.message));
  const offline = createJoplinClient({
    token: 'sensitive-token',
    fetchImpl: async () => { throw new Error('http://localhost/?token=sensitive-token'); },
  });
  await assert.rejects(offline.getNote(id), error => !error.message.includes('sensitive-token'));
});

test('read-only notebook lookup never creates a notebook; duplicate names require a chosen ID', async () => {
  let writes = 0;
  const client = {
    listFolders: async () => [],
    createFolder: async title => { writes += 1; return { id, title }; },
  };
  assert.equal(await resolveDailyFolder(client), null);
  assert.equal(writes, 0);
  assert.equal((await resolveDailyFolder(client, { create: true })).id, id);
  assert.equal(writes, 1);
  client.listFolders = async () => [{ id, title: 'Daily TODO', children: [{ id: 'b'.repeat(32), title: 'Daily TODO' }] }];
  await assert.rejects(resolveDailyFolder(client), /More than one/);
});

test('invalid destinations and note IDs fail before contacting Joplin', async () => {
  for (const baseUrl of ['file:///etc/passwd', 'https://user:password@example.com', 'https://example.com?token=x']) {
    assert.throws(() => createJoplinClient({ baseUrl, token: 'test' }));
  }
  let calls = 0;
  const client = createJoplinClient({ token: 'test', fetchImpl: async () => { calls += 1; return Response.json({}); } });
  assert.throws(() => client.getNote('../../anything'));
  assert.equal(calls, 0);
});
