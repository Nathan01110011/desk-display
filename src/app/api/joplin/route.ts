import { NextResponse } from 'next/server';
import { createJoplinClient, JoplinError, resolveDailyFolder } from '@/lib/joplin-client.mjs';
import { dailyDate, dayKey, hasDailyContent, isVisibleNote, selectDailyNote } from '@/lib/joplin-daily.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store, max-age=0' };

// Display access is deliberately GET-only. Daily maintenance has no HTTP endpoint.
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const mode = params.get('mode') || 'daily';
    if (mode !== 'daily' && mode !== 'pinned') {
      return NextResponse.json({ error: 'Choose a daily or pinned note.' }, { status: 400, headers });
    }
    const timeZone = process.env.JOPLIN_TIME_ZONE || params.get('timeZone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
    let today: string;
    try {
      today = dayKey(new Date(), timeZone);
    } catch {
      return NextResponse.json({ error: 'The daily note timezone is invalid.' }, { status: 400, headers });
    }
    const client = createJoplinClient({
      baseUrl: process.env.JOPLIN_API_URL,
      token: process.env.JOPLIN_API_TOKEN,
    });
    let note = null;
    if (mode === 'pinned') {
      const id = params.get('id') || process.env.JOPLIN_PINNED_NOTE_ID;
      if (!id) return NextResponse.json({ note: null, today, message: 'Choose a note to pin.' }, { headers });
      note = await client.getNote(id);
      if (!isVisibleNote(note)) return NextResponse.json({ error: 'This note is unavailable.' }, { status: 404, headers });
    } else {
      const folder = await resolveDailyFolder(client, { id: process.env.JOPLIN_DAILY_NOTEBOOK_ID });
      if (folder) note = selectDailyNote(await client.listFolderNotes(folder.id), today);
    }
    return NextResponse.json({
      today,
      note: note ? {
        id: note.id, title: note.title, body: note.body,
        updatedTime: note.updated_time, day: dailyDate(note.title),
        hasContent: hasDailyContent(note.body),
      } : null,
      message: note ? null : 'No daily TODO notes yet.',
    }, { headers });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof JoplinError ? error.message : 'The Joplin note could not be loaded.',
    }, { status: error instanceof JoplinError ? error.status : 502, headers });
  }
}
