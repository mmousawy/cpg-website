import { CPGEvent } from "@/types/events";
import dayjs from "dayjs";

export default function AddToCalendar({ event }: { event: CPGEvent }) {
  const calendarDate = dayjs(`${event.date}T${event.time}`);

  const calendarDetails = {
    title: `${event.title} - Creative Photography Group`,
    startDate: calendarDate.format('YYYYMMDDTHHmmssZ'),
    endDate: calendarDate.add(3, 'hour').format('YYYYMMDDTHHmmssZ'),
    outlookStartDate: calendarDate.format('YYYY-MM-DDTHH:mm:ssZ'),
    outlookEndDate: calendarDate.add(3, 'hour').format('YYYY-MM-DDTHH:mm:ssZ'),
    description: event.description,
    location: event.location?.replace(/\r\n/gm, ', '),
  };

  const calendarLinks = {
    google: encodeURIComponent(`https://www.google.com/calendar/render?action=TEMPLATE&text=${calendarDetails.title}&dates=${calendarDetails.startDate}/${calendarDetails.endDate}&details=${calendarDetails.description}&location=${calendarDetails.location}`),
    outlook: encodeURIComponent(`https://outlook.live.com/calendar/action/compose/?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${calendarDetails.title}&startdt=${calendarDetails.outlookStartDate}&enddt=${calendarDetails.outlookEndDate}&body=${calendarDetails.description}&location=${calendarDetails.location}`),
    apple: `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0D%0AVERSION:2.0%0D%0ABEGIN:VEVENT%0D%0ASUMMARY:${calendarDetails.title}%0D%0ADTSTART:${calendarDetails.startDate}%0D%0ADTEND:${calendarDetails.endDate}%0D%0ADESCRIPTION:${calendarDetails.description}%0D%0ALOCATION:${calendarDetails.location}%0D%0AEND:VEVENT%0D%0AEND:VCALENDAR%0D%0A`,
  };

  return (
    <>
      Add this event to your calendar:

      {/* Google */}
      <a
        href={calendarLinks.google}
        target='_blank'
        rel='noopener noreferrer'
        className='underline'
      >
        Google Calendar
      </a>

      {/* Outlook */}
      <a
        href={calendarLinks.outlook}
        target='_blank'
        rel='noopener noreferrer'
        className='underline'
      >
        Outlook Calendar
      </a>

      {/* Apple */}
      <a
        href={calendarLinks.apple}
        download={`${event.title}.ics`}
        className='underline'
      >
        Apple Calendar
      </a>
    </>
  )
}
