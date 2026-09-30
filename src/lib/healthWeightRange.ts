export type WeightRange = '90days' | '30days' | '14days';

export const weightRanges: { value: WeightRange; label: string }[] = [
  { value: '90days', label: '90 days' },
  { value: '30days', label: '30 days' },
  { value: '14days', label: '14 days' },
];

export function weightRangeStart(today: Date, range: WeightRange): Date {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = range === '90days' ? 90 : range === '30days' ? 30 : 14;
  start.setDate(start.getDate() - (days - 1));
  return start;
}

export function healthDateKey(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
