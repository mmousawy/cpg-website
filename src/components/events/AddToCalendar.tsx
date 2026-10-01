import { CPGEvent } from '@/types/events';

import {
  Link,
  Section,
} from '@react-email/components';

import AddToCalendarDropdown from '@/components/events/AddToCalendarDropdown';
import EmailHeading from '@/emails/components/EmailHeading';
import EmailText from '@/emails/components/EmailText';
import { emailCalendarButtonStyle } from '@/emails/components/styles';
import { getCalendarDateTimes } from '@/lib/events/calendarTime';
import { EVENT_TIMEZONE } from '@/lib/events/status';
import { stripHtml } from '@/utils/stripHtml';
import AppleCalendarSVG from 'public/icons/apple-calendar.svg';
import GoogleCalendarSVG from 'public/icons/google-calendar.svg';
import OutlookCalendarSVG from 'public/icons/outlook-calendar.svg';

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

const calendarIcons = {
  google: GoogleCalendarSVG,
  outlook: OutlookCalendarSVG,
  apple: AppleCalendarSVG,
} as const;

export default function AddToCalendar({ event, render }: { event: CPGEvent, render?: 'email' }) {
  const calendarDate = getCalendarDateTimes(event.date, event.time);

  const calendarDetails = {
    title: `${event.title} - Creative Photography Group`,
    // Google/Apple: compact floating datetime (no offset) — mobile GCal rejects +02:00 offsets
    startDate: calendarDate.startDate,
    endDate: calendarDate.endDate,
    outlookStartDate: calendarDate.outlookStartDate,
    outlookEndDate: calendarDate.outlookEndDate,
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
        style={{ marginTop: '28px' }}
      >
        <EmailHeading
          variant="section"
          style={{ margin: '0 0 4px 0' }}
        >
          Add to calendar
        </EmailHeading>

        <EmailText
          style={{ marginBottom: '16px' }}
        >
          Remind yourself to attend this event by adding it to your calendar.
        </EmailText>

        <div>
          {calendarOptions.map(({ id, label, download }) => {
            const Icon = calendarIcons[id];

            return (
              <Link
                key={id}
                href={calendarLinks[id]}
                style={emailCalendarButtonStyle}
                {...(download && { download: appleDownloadName })}
              >
                <Icon
                  width="16"
                  height="16"
                  aria-hidden="true"
                  style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }}
                />
                {label.replace(/ Calendar$/, '')}
              </Link>
            );
          })}
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
