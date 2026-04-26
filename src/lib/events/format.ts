import dayjs from 'dayjs';

type EventDateFormatOptions = {
  includeYear?: boolean;
  style?: 'short' | 'long';
};

export function formatEventDate(
  date: string,
  options: EventDateFormatOptions = {},
): string {
  const { includeYear = false, style = 'short' } = options;
  const eventDate = dayjs(date);
  const currentYear = dayjs().year();
  const showYear = includeYear && eventDate.year() !== currentYear;

  if (style === 'long') {
    return showYear
      ? eventDate.format('dddd, D MMMM YYYY')
      : eventDate.format('dddd, D MMMM');
  }

  return showYear
    ? eventDate.format('ddd, D MMM YYYY')
    : eventDate.format('ddd, D MMM');
}

export function formatEventTime(time: string): string {
  return dayjs(`2000-01-01T${time.length === 5 ? `${time}:00` : time}`).format('HH:mm');
}

export function getDateSortValue(date: string | null | undefined): number {
  return date ? dayjs(date).valueOf() : 0;
}
