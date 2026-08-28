'use client';

import { useState, type ComponentType, type SVGProps } from 'react';

import Button from '@/components/shared/Button';
import Popover from '@/components/shared/Popover';
import AppleCalendarSVG from 'public/icons/apple-calendar.svg';
import CalendarAddSVG from 'public/icons/calendar-add-16.svg';
import GoogleCalendarSVG from 'public/icons/google-calendar.svg';
import OutlookCalendarSVG from 'public/icons/outlook-calendar.svg';

const menuItemClass =
  'flex w-full items-center whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm hover:bg-background';

type CalendarIcon = ComponentType<SVGProps<SVGSVGElement>>;

type CalendarLinkKey = 'google' | 'outlook' | 'apple';

const calendarIcons: Record<CalendarLinkKey, CalendarIcon> = {
  google: GoogleCalendarSVG,
  outlook: OutlookCalendarSVG,
  apple: AppleCalendarSVG,
};

type CalendarOption = {
  id: CalendarLinkKey;
  label: string;
  external?: boolean;
  download?: boolean;
};

type AddToCalendarDropdownProps = {
  options: CalendarOption[];
  links: Record<CalendarLinkKey, string>;
  appleDownloadName: string;
};

export default function AddToCalendarDropdown({
  options,
  links,
  appleDownloadName,
}: AddToCalendarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      align="auto"
      side="auto"
      width="trigger"
      className="rounded-xl border-border-color-strong"
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={(
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="inline-flex!"
          icon={(
            <CalendarAddSVG
              className="size-4 shrink-0 fill-current"
            />
          )}
        >
          Add to calendar
        </Button>
      )}
    >
      <div
        className="p-2"
      >
        {options.map(({ id, label, external, download }) => {
          const Icon = calendarIcons[id];

          return (
            <a
              key={id}
              href={links[id]}
              className={menuItemClass}
              onClick={() => setIsOpen(false)}
              {...(external && {
                target: '_blank',
                rel: 'noopener noreferrer',
              })}
              {...(download && { download: appleDownloadName })}
            >
              <Icon
                className="mr-3 h-4 w-4 shrink-0"
                data-no-inherit
              />
              <span>
                {label}
              </span>
            </a>
          );
        })}
      </div>
    </Popover>
  );
}
