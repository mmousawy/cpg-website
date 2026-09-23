import {
  Column,
  Heading,
  Img,
  Link,
  Row,
  Section,
  Text,
} from '@react-email/components';

import { formatEventDate, formatEventTime } from '@/lib/events/format';
import { CPGEvent } from '@/types/events';
import { getGoogleMapsSearchUrl } from '@/utils/formatLocation';

import RichContent from './RichContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

export default function EventDetails({ event, noDescription }: { event: CPGEvent, noDescription?: boolean }) {
  const eventLocationLines = event.location
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean) ?? [];

  return (
    <Section
      className="my-5"
    >
      <Heading
        as="h2"
        className="m-0 mb-7.5 p-0 text-[16px] font-semibold text-[#171717]"
      >
        Event details
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

          {eventLocationLines.map((line, index) => (
            <Row
              key={index}
            >
              <Text
                className={
                  index === 0
                    ? 'mb-0! mt-2! text-[14px] font-semibold leading-6 text-[#171717]'
                    : 'my-0! pl-8 text-[14px] font-semibold leading-6 text-[#171717]'
                }
              >
                {index === 0 && (
                  <Img
                    src={`${baseUrl}/icons/location.png`}
                    width="24"
                    height="24"
                    className="mx-auto my-0 mr-2 inline align-top"
                  />
                )}
                {line}
              </Text>
            </Row>
          ))}

          {event.location && (
            <Row>
              <Text
                className="my-0! mt-1! pl-8 text-[14px] font-semibold leading-6"
              >
                <Link
                  href={getGoogleMapsSearchUrl(event.location)}
                  className="text-[#38785f] underline"
                >
                  See location on Google Maps
                </Link>
              </Text>
            </Row>
          )}
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
        <Section
          className="mt-6"
        >
          <RichContent
            html={event.description}
          />
        </Section>
      )}
    </Section>
  );
}
