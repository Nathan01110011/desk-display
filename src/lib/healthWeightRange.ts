export type WeightRange = '3months' | 'month' | '2weeks';

export const weightRanges: { value: WeightRange; label: string }[] = [
  { value: '3months', label: '3 months' },
  { value: 'month', label: '1 month' },
  { value: '2weeks', label: '2 weeks' },
];

export function weightRangeStart(today: Date, range: WeightRange): Date {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (range === '2weeks') {
    start.setDate(start.getDate() - 13);
  } else {
    const day = start.getDate();
    start.setDate(1);
    start.setMonth(start.getMonth() - (range === '3months' ? 3 : 1));
    const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    start.setDate(Math.min(day, lastDay));
  }
  return start;
}

export function healthDateKey(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
