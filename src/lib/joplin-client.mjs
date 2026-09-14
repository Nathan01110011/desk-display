/** @typedef {{ id: string, parent_id: string, title: string, body: string, created_time: number, updated_time: number, user_created_time: number, user_updated_time: number, source: string, is_todo: number, todo_due: number, todo_completed: number, markup_language: number, deleted_time: number, is_conflict: number, encryption_applied: number }} JoplinNote */

export const NOTE_FIELDS = [
  'id', 'parent_id', 'title', 'body', 'created_time', 'updated_time',
  'user_created_time', 'user_updated_time', 'source', 'is_todo',
  'todo_due', 'todo_completed', 'markup_language', 'deleted_time',
  'is_conflict', 'encryption_applied',
].join(',');

export class JoplinError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'JoplinError';
    this.status = status;
  }
}

/** Server/worker use only. Credentials and upstream error bodies never reach the browser or logs. */
export function createJoplinClient({ baseUrl = 'http://127.0.0.1:41184', token, fetchImpl = globalThis.fetch }) {
  if (!token) throw new JoplinError('Connect Joplin to display your notes.', 503);
  let base;
  try {
    base = new URL(baseUrl);
  } catch {
    throw new JoplinError('The Joplin connection address is invalid.', 503);
  }
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new JoplinError('Use an HTTP or HTTPS Joplin address without credentials or query parameters.', 503);
  }
  base.pathname = base.pathname.replace(/\/?$/, '/');

  function notePath(id) {
    if (!/^[a-f0-9]{32}$/i.test(id)) throw new JoplinError('Choose a valid Joplin note or notebook.', 400);
    return id;
  }

  async function request(path, { method = 'GET', params = {}, body = undefined, missing = false } = {}) {
    const url = new URL(path, base);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    url.searchParams.set('token', token);
    let response;
    try {
      response = await fetchImpl(url, {
        method,
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
    } catch {
      throw new JoplinError('Joplin is unavailable. Check that it is running and connected.');
    }
    if (missing && response.status === 404) return null;
    if (!response.ok) {
      const message = response.status === 403 || response.status === 401
        ? 'Joplin rejected the connection token.'
        : 'Joplin could not complete the request.';
      throw new JoplinError(message, response.status === 404 ? 404 : 502);
    }
    if (method === 'DELETE') return null;
    try {
      return await response.json();
    } catch {
      throw new JoplinError('Joplin returned an invalid response.');
    }
  }

  async function list(path, params = {}) {
    const items = [];
    for (let page = 1; ; page += 1) {
      const data = await request(path, { params: { ...params, page, limit: 100 } });
      // /folders returns a tree; other collections are paginated.
      if (Array.isArray(data)) return [...items, ...data];
      if (!data || !Array.isArray(data.items)) throw new JoplinError('Joplin returned an invalid list.');
      items.push(...data.items);
      if (!data.has_more) return items;
      if (data.items.length === 0) throw new JoplinError('Joplin returned an incomplete list.');
    }
  }

  return {
    /** @returns {Promise<JoplinNote | null>} */
    getNote: id => request('notes/' + notePath(id), { params: { fields: NOTE_FIELDS, include_deleted: 1, include_conflicts: 1 }, missing: true }),
    /** @returns {Promise<JoplinNote[]>} */
    listFolderNotes: id => list('folders/' + notePath(id) + '/notes', { fields: NOTE_FIELDS }),
    listFolders: () => list('folders', { fields: 'id,title,parent_id,deleted_time' }),
    getFolder: id => request('folders/' + notePath(id), { params: { fields: 'id,title,deleted_time' }, missing: true }),
    createFolder: title => request('folders', { method: 'POST', body: { title } }),
    /** @returns {Promise<JoplinNote>} */
    createNote: note => request('notes', { method: 'POST', body: note }),
    listNoteTags: id => list('notes/' + notePath(id) + '/tags', { fields: 'id' }),
    listNoteResources: id => list('notes/' + notePath(id) + '/resources', { fields: 'id' }),
    // Joplin's default DELETE moves to Trash. Never request permanent deletion.
    trashNote: id => request('notes/' + notePath(id), { method: 'DELETE' }),
  };
}

export async function resolveDailyFolder(client, { id = '', create = false } = {}) {
  if (id) {
    const folder = await client.getFolder(id);
    if (!folder || folder.deleted_time) throw new JoplinError('The daily TODO notebook is unavailable.', 404);
    return folder;
  }
  const matches = [];
  function visit(folders) {
    for (const folder of folders) {
      if (folder.deleted_time) continue;
      if (folder.title === 'Daily TODO') matches.push(folder);
      if (Array.isArray(folder.children)) visit(folder.children);
    }
  }
  visit(await client.listFolders());
  if (matches.length > 1) throw new JoplinError('More than one Daily TODO notebook was found. Select its notebook ID during setup.', 409);
  if (matches.length === 1) return matches[0];
  return create ? client.createFolder('Daily TODO') : null;
}
