import {
  Column,
  Heading,
  Img,
  Row,
  Section,
  Text,
} from '@react-email/components';

import { formatEventDate, formatEventTime } from '@/lib/events/format';
import { CPGEvent } from '@/types/events';

import RichContent from './RichContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export default function EventDetails({ event, noDescription }: { event: CPGEvent, noDescription?: boolean }) {
  const eventLocationSeparated = event.location?.split(/\r\n/) || [];

  return (
    <Section
      className="my-5"
    >
      <Heading
        as="h2"
        className="m-0 mb-7.5 p-0 text-[16px] font-semibold text-[#171717]"
      >
        Meetup details
      </Heading>

      <Row>
        <Column
          className="align-top"
        >
          <Text
            className="mt-0! text-[15px] font-semibold leading-6 text-[#171717]"
          >
            {event.title}
          </Text>

          <Row>
            <Text
              className="my-0! text-[14px] font-semibold leading-6 text-[#171717]"
            >
              <Img
                src={`${baseUrl}/icons/calendar2.png`}
                width="24"
                height="24"
                className="mx-auto my-0 mr-2 inline align-top"
              />
              {formatEventDate(event.date!, { includeYear: true })}
            </Text>
          </Row>

          <Row>
            <Text
              className="my-0! mt-2! text-[14px] font-semibold leading-6 text-[#171717]"
            >
              <Img
                src={`${baseUrl}/icons/time.png`}
                width="24"
                height="24"
                className="mx-auto my-0 mr-2 inline align-top"
              />
              {event.time ? formatEventTime(event.time) : ''}
            </Text>
          </Row>

          <Row>
            <Text
              className="mb-0! mt-2! text-[14px] font-semibold leading-6 text-[#171717]"
            >
              <Img
                src={`${baseUrl}/icons/location.png`}
                width="24"
                height="24"
                className="mx-auto my-0 mr-2 inline align-top"
              />
              {eventLocationSeparated[0]}
            </Text>
            <Text
              className="my-0! pl-8 text-[14px] font-semibold leading-6 text-[#171717]"
            >
              {eventLocationSeparated[1]}
            </Text>
            <Text
              className="my-0! pl-8 text-[14px] font-semibold leading-6 text-[#171717]"
            >
              {eventLocationSeparated[2]}
            </Text>
          </Row>
        </Column>

        <Column
          className="pl-4 text-right align-top"
        >
          <Img
            src={event.cover_image!}
            width="128"
            height="128"
            alt="Event cover image"
            className="inline size-32 rounded-md object-cover"
          />
        </Column>
      </Row>

      {!noDescription && event.description && (
        <RichContent
          html={event.description}
        />
      )}
    </Section>
  );
}
