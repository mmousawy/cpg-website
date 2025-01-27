import { CPGEvent } from "@/types/events";
import dayjs from "dayjs";

import {
  Button,
  Section,
  Text,
} from "@react-email/components";

import AddSVG from "public/icons/add.svg";

export default function AddToCalendar({ event, render, }: { event: CPGEvent, render?: 'email' }) {
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

  // Use encodeURIComponent to encode all the details in the calendar links
  const encDetails = calendarDetails;

  for (const [key, value] of Object.entries(calendarDetails)) {
    encDetails[key as keyof typeof calendarDetails] = encodeURIComponent(value!);
  }

  const calendarLinks = {
    google: `https://www.google.com/calendar/render?action=TEMPLATE&text=${encDetails.title}&dates=${encDetails.startDate}/${encDetails.endDate}&details=${encDetails.description}&location=${encDetails.location}`,
    outlook: `https://outlook.live.com/calendar/action/compose/?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${encDetails.title}&startdt=${encDetails.outlookStartDate}&enddt=${encDetails.outlookEndDate}&body=${encDetails.description}&location=${encDetails.location}`,
    apple: `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0D%0AVERSION:2.0%0D%0ABEGIN:VEVENT%0D%0ASUMMARY:${encDetails.title}%0D%0ADTSTART:${encDetails.startDate}%0D%0ADTEND:${encDetails.endDate}%0D%0ADESCRIPTION:${encDetails.description}%0D%0ALOCATION:${encDetails.location}%0D%0AEND:VEVENT%0D%0AEND:VCALENDAR%0D%0A`,
  };

  const buttonStyle = 'flex gap-2 whitespace-nowrap items-center rounded-full bg-background text-foreground border-[0.0625rem] border-border-color px-3 py-1 font-mono text-[14px] font-semibold fill-foreground no-underline hover:border-primary-alt hover:bg-primary-alt hover:fill-slate-950 hover:text-slate-950';
  const emailButtonStyle = 'inline-block rounded-full bg-[#f7f7f7] text-[#171717] border-[0.0625rem] border-[#e5e7ea] px-4 py-1 font-mono text-[14px] font-semibold no-underline';

  if (render === 'email') {
    return (
      <Section className="mt-[30px]">
        <Text className="!mt-0 text-[14px] leading-[24px] text-[#171717]">Add this event to your calendar:</Text>
  
        <div className="flex flex-col items-start gap-2">
          {/* Google */}
          <Button
            href={calendarLinks.google}
            className={emailButtonStyle}
          >
            Google Calendar
          </Button>
  
          {/* Outlook */}
          <Button
            href={calendarLinks.outlook}
            className={emailButtonStyle}
          >
            Outlook Calendar
          </Button>
  
          {/* Apple */}
          <Button
            href={calendarLinks.apple}
            download={`${event.title}.ics`}
            className={emailButtonStyle}
          >
            Apple Calendar
          </Button>
        </div>
      </Section>
    )
  }

  return (
    <div className="flex flex-col gap-2 max-sm:gap-4">
      <span>Add this event to your calendar:</span>

      <div className="flex items-start gap-2 max-sm:flex-col max-sm:gap-4">
        {/* Google */}
        <a
          href={calendarLinks.google}
          target='_blank'
          rel='noopener noreferrer'
          className={`${buttonStyle} font-[family-name:var(--font-geist-mono)]`}
        >
          <AddSVG className="shrink-0" />
          Google Calendar
        </a>

        {/* Outlook */}
        <a
          href={calendarLinks.outlook}
          target='_blank'
          rel='noopener noreferrer'
          className={`${buttonStyle} font-[family-name:var(--font-geist-mono)]`}
        >
          <AddSVG className="shrink-0" />
          Outlook Calendar
        </a>

        {/* Apple */}
        <a
          href={calendarLinks.apple}
          download={`${event.title}.ics`}
          className={`${buttonStyle} font-[family-name:var(--font-geist-mono)]`}
        >
          <AddSVG className="shrink-0" />
          Apple Calendar
        </a>
      </div>
    </div>
  )
}
