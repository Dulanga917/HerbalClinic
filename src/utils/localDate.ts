const pad = (value: number) => String(value).padStart(2, '0');

const parse = (iso: string): Date | null => {
  const date = new Date(iso);
  return iso && !Number.isNaN(date.getTime()) ? date : null;
};

/** Calendar date (YYYY-MM-DD) in the phone's time zone; stored timestamps are UTC. */
export const formatLocalDate = (iso: string): string => {
  const date = parse(iso);
  if (!date) {
    return String(iso || '').slice(0, 10);
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** 24-hour clock time (HH:MM) in the phone's time zone, or an empty string if unreadable. */
export const formatLocalTime = (iso: string): string => {
  const date = parse(iso);
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '';
};
