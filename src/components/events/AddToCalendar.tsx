import { CPGEvent } from '@/types/events';
import dayjs from 'dayjs';

import {
  Button as EmailButton,
  Section,
  Text,
} from '@react-email/components';

import AddToCalendarDropdown from '@/components/events/AddToCalendarDropdown';
import { EVENT_TIMEZONE } from '@/lib/events/status';
import { stripHtml } from '@/utils/stripHtml';

function normalizeEventTime(time: string | null) {
  if (!time) return '00:00:00';
  if (time.length === 5) return `${time}:00`;

  return time;
}

type CalendarLinkKey = 'google' | 'outlook' | 'apple';

const calendarOptions: Array<{
  id: CalendarLinkKey;
  label: string;
  external?: boolean;
  download?: boolean;
}> = [
  { id: 'google', label: 'Google Calendar', external: true },
  { id: 'outlook', label: 'Outlook Calendar', external: true },
  { id: 'apple', label: 'Apple Calendar', download: true },
];

const emailButtonStyle =
  'inline-block rounded-full bg-[#f7f7f7] text-[#171717] border-[0.0625rem] border-[#e5e7ea] px-4 py-1 font-mono text-[14px] font-semibold no-underline';

export default function AddToCalendar({ event, render }: { event: CPGEvent, render?: 'email' }) {
  const calendarDate = dayjs.tz(
    `${event.date} ${normalizeEventTime(event.time)}`,
    'YYYY-MM-DD HH:mm:ss',
    EVENT_TIMEZONE,
  );
  const calendarEndDate = calendarDate.add(3, 'hour');

  const calendarDetails = {
    title: `${event.title} - Creative Photography Group`,
    // Google/Apple: compact floating datetime (no offset) — mobile GCal rejects +02:00 offsets
    startDate: calendarDate.format('YYYYMMDDTHHmmss'),
    endDate: calendarEndDate.format('YYYYMMDDTHHmmss'),
    outlookStartDate: calendarDate.format('YYYY-MM-DDTHH:mm:ssZ'),
    outlookEndDate: calendarEndDate.format('YYYY-MM-DDTHH:mm:ssZ'),
    description: stripHtml(event.description ?? ''),
    location: event.location?.replace(/\n/gm, ', '),
  };

  // Use encodeURIComponent to encode all the details in the calendar links
  const encDetails = calendarDetails;

  for (const [key, value] of Object.entries(calendarDetails)) {
    encDetails[key as keyof typeof calendarDetails] = encodeURIComponent(value!);
  }

  const calendarLinks: Record<CalendarLinkKey, string> = {
    google: `https://www.google.com/calendar/render?action=TEMPLATE&text=${encDetails.title}&dates=${encDetails.startDate}/${encDetails.endDate}&ctz=${encodeURIComponent(EVENT_TIMEZONE)}&details=${encDetails.description}&location=${encDetails.location}`,
    outlook: `https://outlook.live.com/calendar/action/compose/?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${encDetails.title}&startdt=${encDetails.outlookStartDate}&enddt=${encDetails.outlookEndDate}&body=${encDetails.description}&location=${encDetails.location}`,
    apple: `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0D%0AVERSION:2.0%0D%0ABEGIN:VEVENT%0D%0ASUMMARY:${encDetails.title}%0D%0ADTSTART:${encDetails.startDate}%0D%0ADTEND:${encDetails.endDate}%0D%0ADESCRIPTION:${encDetails.description}%0D%0ALOCATION:${encDetails.location}%0D%0AEND:VEVENT%0D%0AEND:VCALENDAR%0D%0A`,
  };

  const appleDownloadName = `${event.title}.ics`;

  if (render === 'email') {
    return (
      <Section
        className="mt-7.5"
      >
        <Text
          className="mt-0! text-[14px] leading-6 text-[#171717]"
        >
          Add this event to your calendar:
        </Text>

        <div
          className="flex flex-col items-start gap-2"
        >
          {calendarOptions.map(({ id, label, download }) => (
            <EmailButton
              key={id}
              href={calendarLinks[id]}
              className={emailButtonStyle}
              {...(download && { download: appleDownloadName })}
            >
              {label}
            </EmailButton>
          ))}
        </div>
      </Section>
    );
  }

  return (
    <AddToCalendarDropdown
      options={calendarOptions}
      links={calendarLinks}
      appleDownloadName={appleDownloadName}
    />
  );
}
