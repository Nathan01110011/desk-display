import { NextResponse } from 'next/server';
import {
  createPersonalCalendarEvent,
  deletePersonalCalendarEvent,
  fetchPersonalCalendarEvents,
  updatePersonalCalendarEvent
} from '@/lib/personalCalendar';
import { CalendarEventInput } from '@/types';
import { logger } from '@/lib/logger';

function getRange(request: Request) {
  const url = new URL(request.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  const now = new Date();
  const start = startParam ? new Date(startParam) : new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const end = endParam ? new Date(endParam) : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), 23, 59, 59);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid personal calendar range');
  }

  return { start, end };
}

async function readInput(request: Request) {
  return await request.json() as CalendarEventInput;
}

export async function GET(request: Request) {
  try {
    const { start, end } = getRange(request);
    const events = await fetchPersonalCalendarEvents(start, end);
    return NextResponse.json(events);
  } catch (error) {
    logger.error('Personal Calendar Error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    await createPersonalCalendarEvent(await readInput(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('Personal Calendar Create Error:', error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    await updatePersonalCalendarEvent(await readInput(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('Personal Calendar Update Error:', error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    await deletePersonalCalendarEvent(await readInput(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('Personal Calendar Delete Error:', error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
