import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, BriefcaseBusiness, Heart, Circle } from 'lucide-react';

interface CalendarAppViewProps {
  now: Date;
}

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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

export function CalendarAppView({ now }: CalendarAppViewProps) {
  const today = useMemo(() => startOfDay(now), [now]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  const days = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const selectedDayName = selectedDate.toLocaleDateString(undefined, { weekday: 'long' });
  const selectedMonthName = selectedDate.toLocaleDateString(undefined, { month: 'long' });

  const moveMonth = (amount: number) => {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const jumpToToday = () => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  return (
    <div className="w-full h-full grid grid-cols-[minmax(0,1fr)_22rem] gap-8 items-stretch">
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
                  {isToday && (
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-black' : 'bg-emerald-300'}`} />
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
          <p className="text-2xl font-bold text-white/80">{selectedDayName}</p>
          <p className="text-lg font-bold text-white/35">{selectedMonthName} {selectedDate.getFullYear()}</p>
        </div>

        <div className="mt-8 rounded-3xl bg-white/[0.03] border border-white/5 p-5">
          <p className="text-white/35 text-xs font-black uppercase tracking-[0.24em] mb-3">Readable date</p>
          <p className="text-xl font-bold text-white/85">{sameDayFormatter.format(selectedDate)}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <BriefcaseBusiness size={22} className="text-sky-300/70" />
            <p className="mt-3 text-sm font-black uppercase tracking-widest text-white/30">Work</p>
            <p className="text-2xl font-black text-white/80">0</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <Heart size={22} className="text-rose-300/70" />
            <p className="mt-3 text-sm font-black uppercase tracking-widest text-white/30">Personal</p>
            <p className="text-2xl font-black text-white/80">0</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/25">Future calendars</p>
          {['Work calendar', 'Personal calendar'].map((label, index) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3">
              <Circle size={10} className={index === 0 ? 'fill-sky-300 text-sky-300' : 'fill-rose-300 text-rose-300'} />
              <span className="text-base font-bold text-white/55">{label}</span>
              <span className="ml-auto text-xs font-black uppercase tracking-widest text-white/20">Later</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
