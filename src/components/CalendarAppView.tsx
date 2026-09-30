import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, BriefcaseBusiness, Heart, Circle, Clock, Plus, Pencil, Trash2, X, Save, Minus, LoaderCircle, Check, Repeat } from 'lucide-react';
import { CalendarEvent, CalendarEventInput } from '@/types';

interface CalendarAppViewProps {
  now: Date;
  calendar: CalendarEvent[];
  personalCalendar: CalendarEvent[];
  personalCalendarLoading: boolean;
  onSavePersonalEvent: (event: CalendarEventInput) => Promise<void>;
  onDeletePersonalEvent: (event: CalendarEventInput) => Promise<void>;
}

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const recurrenceOptions = [
  { label: 'Once', value: 'none' as const },
  { label: 'Weekly', value: 'weekly' as const },
  { label: 'Monthly', value: 'monthly' as const },
  { label: 'Yearly', value: 'yearly' as const }
];
const sameDayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});
const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric'
});
const compactDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric'
});
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getCalendarDays(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function eventOverlapsDay(event: CalendarEvent, date: Date) {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  return new Date(event.end) > dayStart && new Date(event.start) < dayEnd;
}

function formatEventTime(event: CalendarEvent) {
  if (event.isAllDay) return 'All day';

  const start = new Date(event.start);
  const end = new Date(event.end);
  return `${timeFormatter.format(start)}-${timeFormatter.format(end)}`;
}

function toDateTimeInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function fromDateTimeInputValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function shiftDateTimeValue(value: string, field: 'day' | 'hour' | 'minute', amount: number) {
  const date = fromDateTimeInputValue(value);

  if (field === 'day') date.setDate(date.getDate() + amount);
  if (field === 'hour') date.setHours(date.getHours() + amount);
  if (field === 'minute') date.setMinutes(date.getMinutes() + amount);

  return toDateTimeInputValue(date);
}

function formatDraftDateTime(value: string) {
  const date = fromDateTimeInputValue(value);
  return `${compactDateFormatter.format(date)} ${timeFormatter.format(date)}`;
}

function formatRecurrenceLabel(recurrence: CalendarEventInput['recurrence']) {
  return recurrenceOptions.find(option => option.value === recurrence)?.label || 'Once';
}

function getDefaultDraft(date: Date): CalendarEventInput {
  const start = new Date(date);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(10, 0, 0, 0);

  return {
    summary: '',
    start: toDateTimeInputValue(start),
    end: toDateTimeInputValue(end),
    location: '',
    isAllDay: false,
    recurrence: 'none'
  };
}

function eventToDraft(event: CalendarEvent): CalendarEventInput {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const inclusiveEnd = event.isAllDay && startOfDay(end) > startOfDay(start) ? addDays(end, -1) : end;

  return {
    id: event.id,
    etag: event.etag,
    summary: event.summary,
    start: toDateTimeInputValue(start),
    end: toDateTimeInputValue(inclusiveEnd),
    location: event.location || '',
    isAllDay: event.isAllDay,
    recurrence: event.recurrence || 'none'
  };
}

interface DateTimeControlProps {
  label: string;
  value: string;
  isAllDay: boolean;
  onChange: (value: string) => void;
}

function DateTimeControl({ label, value, isAllDay, onChange }: DateTimeControlProps) {
  const date = fromDateTimeInputValue(value);
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.22em] text-white/30">{label}</span>
        <span className="text-sm font-black text-rose-100/70">{compactDateFormatter.format(date)}</span>
      </div>

      <div className="mt-1.5 grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2.5">
        <button
          type="button"
          onPointerDown={() => onChange(shiftDateTimeValue(value, 'day', -1))}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/60 transition-all active:scale-95"
          aria-label={`Move ${label.toLowerCase()} back one day`}
        >
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 rounded-xl border border-white/5 bg-black/20 px-3 py-1.5 text-center">
          <p className="truncate text-lg font-black leading-none text-white">{date.getDate()}</p>
          <p className="mt-1 truncate text-xs font-black uppercase tracking-[0.18em] text-white/35">
            {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long' })}
          </p>
        </div>
        <button
          type="button"
          onPointerDown={() => onChange(shiftDateTimeValue(value, 'day', 1))}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/60 transition-all active:scale-95"
          aria-label={`Move ${label.toLowerCase()} forward one day`}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {!isAllDay && (
        <div className="mt-1.5 grid grid-cols-2 gap-2.5">
          {[
            { name: 'Hour', value: hour, field: 'hour' as const, step: 1 },
            { name: 'Minute', value: minute, field: 'minute' as const, step: 15 }
          ].map(control => (
            <div key={control.name} className="rounded-xl border border-white/5 bg-black/20 p-1.5">
              <p className="text-center text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/25">{control.name}</p>
              <div className="mt-1.5 grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2">
                <button
                  type="button"
                  onPointerDown={() => onChange(shiftDateTimeValue(value, control.field, -control.step))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/55 transition-all active:scale-95"
                  aria-label={`Decrease ${label.toLowerCase()} ${control.name.toLowerCase()}`}
                >
                  <Minus size={16} />
                </button>
                <span className="text-center text-lg font-black tabular-nums leading-none text-white">{control.value}</span>
                <button
                  type="button"
                  onPointerDown={() => onChange(shiftDateTimeValue(value, control.field, control.step))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/55 transition-all active:scale-95"
                  aria-label={`Increase ${label.toLowerCase()} ${control.name.toLowerCase()}`}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CalendarAppView({
  now,
  calendar,
  personalCalendar,
  personalCalendarLoading,
  onSavePersonalEvent,
  onDeletePersonalEvent
}: CalendarAppViewProps) {
  const today = useMemo(() => startOfDay(now), [now]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [draft, setDraft] = useState<CalendarEventInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  const days = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const eventMarkersByDay = useMemo(() => {
    const grouped = new Map<string, { work: boolean; personal: boolean }>();

    days.forEach(date => {
      const key = startOfDay(date).toISOString();
      const hasWork = calendar.some(event => eventOverlapsDay(event, date));
      const hasPersonal = personalCalendar.some(event => eventOverlapsDay(event, date));

      if (hasWork || hasPersonal) {
        grouped.set(key, { work: hasWork, personal: hasPersonal });
      }
    });

    return grouped;
  }, [calendar, days, personalCalendar]);
  const selectedWorkEvents = calendar.filter(event => eventOverlapsDay(event, selectedDate));
  const selectedPersonalEvents = personalCalendar.filter(event => eventOverlapsDay(event, selectedDate));
  const selectedEvents = [...selectedWorkEvents, ...selectedPersonalEvents];
  const isEditingPersonalEvent = Boolean(draft?.id);

  const updateDraft = (updates: Partial<CalendarEventInput>) => {
    setDraft(current => current ? { ...current, ...updates } : current);
  };

  const updateDraftDateTime = (field: 'start' | 'end', value: string) => {
    if (field === 'start') {
      const nextStart = fromDateTimeInputValue(value);
      setSelectedDate(startOfDay(nextStart));
      setVisibleMonth(new Date(nextStart.getFullYear(), nextStart.getMonth(), 1));
    }

    setDraft(current => {
      if (!current) return current;

      const next = { ...current, [field]: value };
      if (field === 'start') {
        const previousStart = fromDateTimeInputValue(current.start);
        const previousEnd = fromDateTimeInputValue(current.end);
        const duration = Math.max(previousEnd.getTime() - previousStart.getTime(), 60 * 60 * 1000);
        const nextStart = fromDateTimeInputValue(value);
        const nextEnd = fromDateTimeInputValue(next.end);

        if (nextEnd <= nextStart) {
          next.end = toDateTimeInputValue(new Date(nextStart.getTime() + duration));
        }
      }

      return next;
    });
  };

  const startNewPersonalEvent = () => {
    setSaveStatus('idle');
    setSaveError('');
    setDraft(getDefaultDraft(selectedDate));
  };

  const handleSavePersonalEvent = async () => {
    if (!draft) return;
    const event = { ...draft, summary: draft.summary.trim() };
    if (!event.summary) {
      setSaveStatus('error');
      setSaveError('Add an event title before saving.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError('');
    try {
      await onSavePersonalEvent(event);
      setSaveStatus('saved');
      await new Promise(resolve => setTimeout(resolve, 650));
      setDraft(null);
    } catch (error) {
      console.error('Personal calendar save failed', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Unable to save this event.');
    } finally {
      setIsSaving(false);
      setSaveStatus(current => current === 'saving' ? 'idle' : current);
    }
  };

  const handleDeleteDraft = async () => {
    if (!draft?.id) return;
    await onDeletePersonalEvent(draft);
    setDraft(null);
  };

  const moveMonth = (amount: number) => {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const jumpToToday = () => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
    setDraft(null);
  };

  return (
    <div className="relative w-full h-full grid grid-cols-[minmax(0,1fr)_22rem] gap-8 items-stretch">
      <section className="min-h-0 flex flex-col rounded-[2rem] bg-white/[0.04] border border-white/10 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between gap-6 px-8 py-6 border-b border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-3 text-white/30 font-bold uppercase tracking-[0.3em] text-xs">
              <CalendarDays size={18} /> Calendar
            </div>
            <h2 className="mt-3 text-5xl font-black tracking-tight leading-none truncate">
              {monthFormatter.format(visibleMonth)}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onPointerDown={() => moveMonth(-1)}
              className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 active:scale-95 transition-all"
              aria-label="Previous month"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              onPointerDown={jumpToToday}
              className="h-14 px-5 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
            >
              Today
            </button>
            <button
              onPointerDown={() => moveMonth(1)}
              className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 active:scale-95 transition-all"
              aria-label="Next month"
            >
              <ChevronRight size={28} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 px-6 pt-5 pb-3 gap-2 shrink-0">
          {dayLabels.map(day => (
            <div key={day} className="text-center text-xs font-black uppercase tracking-[0.24em] text-white/25">
              {day}
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 grid grid-cols-7 grid-rows-6 gap-2 p-6 pt-0">
          {days.map(date => {
            const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
            const isToday = isSameDay(date, today);
            const isSelected = isSameDay(date, selectedDate);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const eventMarkers = eventMarkersByDay.get(startOfDay(date).toISOString());
            const hasWorkEvents = Boolean(eventMarkers?.work);
            const hasPersonalEvents = Boolean(eventMarkers?.personal);

            return (
              <button
                key={date.toISOString()}
                onPointerDown={() => setSelectedDate(startOfDay(date))}
                className={`relative rounded-2xl border p-3 text-left flex flex-col justify-between overflow-hidden active:scale-[0.98] transition-all ${
                  isSelected
                    ? 'bg-white text-black border-white shadow-2xl'
                    : isToday
                      ? 'bg-emerald-400/10 border-emerald-300/40 text-white'
                      : 'bg-white/[0.03] border-white/5 text-white hover:bg-white/[0.06]'
                } ${isCurrentMonth ? '' : 'opacity-35'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl font-black tabular-nums leading-none">{date.getDate()}</span>
                  {(isToday || hasWorkEvents || hasPersonalEvents) && (
                    <span className="mt-1 flex items-center gap-1">
                      {hasWorkEvents && (
                        <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-sky-700' : 'bg-sky-300'}`} />
                      )}
                      {hasPersonalEvents && (
                        <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-rose-700' : 'bg-rose-300'}`} />
                      )}
                      {isToday && (
                        <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-black' : 'bg-emerald-300'}`} />
                      )}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-black uppercase tracking-widest ${
                  isSelected ? 'text-black/45' : isWeekend ? 'text-sky-200/45' : 'text-white/25'
                }`}>
                  {date.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="min-h-0 rounded-[2rem] bg-white/[0.04] border border-white/10 p-8 flex flex-col">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-white/25">Selected date</p>
          <h3 className="text-5xl font-black tracking-tight leading-none">{selectedDate.getDate()}</h3>
          <p className="text-xl font-bold leading-snug text-white/80">{sameDayFormatter.format(selectedDate)}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <BriefcaseBusiness size={22} className="text-sky-300/70" />
            <p className="mt-3 text-sm font-black uppercase tracking-widest text-white/30">Work</p>
            <p className="text-2xl font-black text-white/80">{selectedWorkEvents.length}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <Heart size={22} className="text-rose-300/70" />
            <p className="mt-3 text-sm font-black uppercase tracking-widest text-white/30">Personal</p>
            <p className="text-2xl font-black text-white/80">{selectedPersonalEvents.length}</p>
          </div>
        </div>

        <div className="mt-6 min-h-0 flex-1 flex flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide space-y-5 pr-1">
            {selectedEvents.length === 0 ? (
              <div className="h-full min-h-36 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center px-5 text-center">
                <div className="space-y-3">
                  <Clock size={24} className="mx-auto text-white/20" />
                  <p className="text-base font-bold text-white/30">No calendar events</p>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/25">Work calendar</p>
              {selectedWorkEvents.length > 0 ? (
                selectedWorkEvents.map(event => (
                  <div key={`${event.start}-${event.summary}`} className="rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3">
                    <div className="flex items-center gap-2 text-sky-200/60">
                      <Circle size={9} className="fill-sky-300 text-sky-300 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-widest">{formatEventTime(event)}</span>
                    </div>
                    <p className="mt-2 text-base font-bold leading-snug text-white/80 line-clamp-2">{event.summary}</p>
                    {event.location && (
                      <p className="mt-1 text-xs font-bold leading-snug text-white/30 line-clamp-1">{event.location}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3 text-sm font-bold text-white/25">No work events</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-white/25">Personal calendar</p>
                <button
                  onPointerDown={startNewPersonalEvent}
                  className="ml-auto h-9 w-9 rounded-xl bg-rose-300 text-black flex items-center justify-center active:scale-95 transition-all"
                  aria-label="Create personal event"
                >
                  <Plus size={18} />
                </button>
              </div>

              {personalCalendarLoading ? (
                <p className="rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3 text-sm font-bold text-white/25">Loading personal events</p>
              ) : selectedPersonalEvents.length > 0 ? (
                selectedPersonalEvents.map(event => (
                  <div key={`${event.id}-${event.start}`} className="rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3">
                    <div className="flex items-center gap-2 text-rose-200/60">
                      <Circle size={9} className="fill-rose-300 text-rose-300 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-widest">{formatEventTime(event)}</span>
                      <button
                        onPointerDown={() => {
                          setSaveStatus('idle');
                          setSaveError('');
                          setDraft(eventToDraft(event));
                        }}
                        className="ml-auto h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 active:scale-95 transition-all"
                        aria-label="Edit personal event"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                    <p className="mt-2 text-base font-bold leading-snug text-white/80 line-clamp-2">{event.summary}</p>
                    {event.location && (
                      <p className="mt-1 text-xs font-bold leading-snug text-white/30 line-clamp-1">{event.location}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3 text-sm font-bold text-white/25">No personal events</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {draft && (
        <div className="absolute inset-0 z-[150] overflow-hidden rounded-[2rem] border border-white/10 bg-black/95">
          <div className="flex h-full flex-col">
            <div className="shrink-0 flex items-center justify-between gap-4 border-b border-white/10 px-6 py-3">
              <div className="min-w-0">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-rose-200/45">Personal calendar</p>
                <h2 className="mt-1 truncate text-3xl font-black leading-none tracking-tight">
                  {isEditingPersonalEvent ? 'Edit event' : 'New event'}
                </h2>
              </div>
              <button
                onPointerDown={() => {
                  if (isSaving) return;
                  setDraft(null);
                }}
                disabled={isSaving}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition-all active:scale-95 disabled:opacity-35"
                aria-label="Close personal event editor"
              >
                <X size={24} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden px-6 py-4">
              <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_18rem] gap-5">
                <div className="min-w-0 min-h-0 overflow-y-auto scrollbar-hide pr-1">
                  <div className="grid min-h-full grid-rows-[auto_auto_auto_auto] gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.22em] text-white/30">Title</span>
                    <input
                      value={draft.summary}
                      onChange={event => updateDraft({ summary: event.target.value })}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-xl font-black text-white outline-none transition-colors placeholder:text-white/15 focus:border-rose-200/60"
                      placeholder="Event title"
                    />
                  </label>

                  <div className="grid min-h-0 grid-cols-2 gap-3">
                    <DateTimeControl
                      label="Start"
                      value={draft.start}
                      isAllDay={draft.isAllDay}
                      onChange={value => updateDraftDateTime('start', value)}
                    />
                    <DateTimeControl
                      label="End"
                      value={draft.end}
                      isAllDay={draft.isAllDay}
                      onChange={value => updateDraftDateTime('end', value)}
                    />
                  </div>

                  <label className="block min-h-0">
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.22em] text-white/30">Location</span>
                    <input
                      value={draft.location || ''}
                      onChange={event => updateDraft({ location: event.target.value })}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-base font-bold text-white outline-none transition-colors placeholder:text-white/15 focus:border-rose-200/60"
                      placeholder="Location"
                    />
                  </label>

                  <div className="grid min-h-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3">
                    <button
                      onPointerDown={() => updateDraft({ isAllDay: !draft.isAllDay })}
                      className={`flex min-h-20 items-center justify-between rounded-2xl border px-5 text-left transition-all active:scale-[0.99] ${
                        draft.isAllDay
                          ? 'border-rose-200/40 bg-rose-200/15 text-rose-100'
                          : 'border-white/10 bg-white/[0.05] text-white/60'
                      }`}
                      aria-pressed={draft.isAllDay}
                    >
                      <span className="text-sm font-black uppercase tracking-[0.18em]">All day</span>
                      <span className={`h-8 w-14 rounded-full p-1 transition-colors ${draft.isAllDay ? 'bg-rose-200' : 'bg-white/10'}`}>
                        <span className={`block h-6 w-6 rounded-full bg-black transition-transform ${draft.isAllDay ? 'translate-x-6' : ''}`} />
                      </span>
                    </button>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-2.5">
                      <div className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-white/30">
                        <Repeat size={16} /> Repeat
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                      {recurrenceOptions.map(option => {
                        const isActive = (draft.recurrence || 'none') === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onPointerDown={() => updateDraft({ recurrence: option.value })}
                              className={`h-9 rounded-xl border text-xs font-black uppercase tracking-[0.16em] transition-all active:scale-95 ${
                                isActive
                                  ? 'border-rose-200/40 bg-rose-200/20 text-rose-50'
                                  : 'border-white/10 bg-black/20 text-white/40'
                              }`}
                              aria-pressed={isActive}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-white/25">Date</p>
                    <p className="text-3xl font-black leading-tight text-white">{sameDayFormatter.format(fromDateTimeInputValue(draft.start))}</p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-white/25">Summary</p>
                    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-4">
                      <p className="line-clamp-2 text-lg font-black leading-snug text-white/85">
                        {draft.summary.trim() || 'Untitled event'}
                      </p>
                      <p className="mt-3 text-sm font-bold text-white/35">
                        {draft.isAllDay ? 'All day' : `${formatDraftDateTime(draft.start)} - ${formatDraftDateTime(draft.end)}`}
                      </p>
                      {draft.recurrence && draft.recurrence !== 'none' && (
                        <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-rose-200/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-rose-100/70">
                          <Repeat size={13} /> {formatRecurrenceLabel(draft.recurrence)}
                        </p>
                      )}
                      {draft.location && (
                        <p className="mt-2 line-clamp-2 text-sm font-bold text-white/30">{draft.location}</p>
                      )}
                    </div>
                  </div>

                  {saveStatus !== 'idle' && (
                    <div className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-4 ${
                      saveStatus === 'saved'
                        ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
                        : saveStatus === 'error'
                          ? 'border-red-300/25 bg-red-300/10 text-red-100'
                          : 'border-rose-200/20 bg-rose-200/10 text-rose-100'
                    }`}>
                      {saveStatus === 'saved' ? (
                        <Check size={22} className="shrink-0" />
                      ) : saveStatus === 'saving' ? (
                        <LoaderCircle size={22} className="shrink-0 animate-spin" />
                      ) : (
                        <X size={22} className="shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-black uppercase tracking-[0.18em]">
                          {saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Not saved' : 'Saving'}
                        </p>
                        <p className="mt-1 text-sm font-bold opacity-55">
                          {saveStatus === 'saved'
                            ? 'Personal calendar updated'
                            : saveStatus === 'error'
                              ? saveError
                              : 'Writing to personal calendar'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto space-y-3 pt-6">
                    <button
                      onClick={handleSavePersonalEvent}
                      disabled={isSaving || !draft.summary.trim()}
                      className={`flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-base font-black uppercase tracking-[0.18em] transition-all active:scale-95 disabled:opacity-70 ${
                        saveStatus === 'saved' ? 'bg-emerald-300 text-black' : 'bg-white text-black'
                      }`}
                    >
                      {saveStatus === 'saving' ? (
                        <>
                          <LoaderCircle size={22} className="animate-spin" /> Saving
                        </>
                      ) : saveStatus === 'saved' ? (
                        <>
                          <Check size={22} /> Saved
                        </>
                      ) : (
                        <>
                          <Save size={22} /> Save
                        </>
                      )}
                    </button>
                    {isEditingPersonalEvent && (
                      <button
                        onPointerDown={handleDeleteDraft}
                        disabled={isSaving}
                        className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-red-400/15 bg-red-500/10 text-sm font-black uppercase tracking-[0.18em] text-red-200/85 transition-all active:scale-95 disabled:opacity-40"
                      >
                        <Trash2 size={20} /> Delete
                      </button>
                    )}
                    <button
                      onPointerDown={() => {
                        if (isSaving) return;
                        setDraft(null);
                      }}
                      disabled={isSaving}
                      className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black uppercase tracking-[0.18em] text-white/55 transition-all active:scale-95 disabled:opacity-35"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
