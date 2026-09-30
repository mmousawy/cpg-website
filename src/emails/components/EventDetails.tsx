import {
  Column,
  Img,
  Link,
  Row,
  Section,
  Text,
} from '@react-email/components';

import { formatEventDate, formatEventTime } from '@/lib/events/format';
import { CPGEvent } from '@/types/events';
import { getGoogleMapsSearchUrl } from '@/utils/formatLocation';

import EmailHeading from './EmailHeading';
import RichContent from './RichContent';
import { emailAccentLinkStyle, emailColors } from './styles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

const eventMetaLineStyle = {
  margin: '8px 0 0 0',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: '24px',
  color: emailColors.text,
} as const;

const eventTitleStyle = {
  margin: 0,
  fontSize: '15px',
  fontWeight: 600,
  lineHeight: '24px',
  color: emailColors.text,
  marginBottom: '8px',
} as const;

const iconInlineStyle = {
  margin: '0 8px 0 0',
  display: 'inline',
  verticalAlign: 'top',
} as const;

export default function EventDetails({ event, noDescription }: { event: CPGEvent, noDescription?: boolean }) {
  const eventLocationLines = event.location
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean) ?? [];

  return (
    <Section
      style={{ margin: '20px 0' }}
    >
      <EmailHeading
        variant="subsection"
      >
        Event details
      </EmailHeading>

      <Row>
        <Column
          style={{ verticalAlign: 'top' }}
        >
          <Text
            style={eventTitleStyle}
          >
            {event.title}
          </Text>

          <Row>
            <Text
              style={{ ...eventMetaLineStyle, margin: 0 }}
            >
              <Img
                src={`${baseUrl}/icons/calendar2.png`}
                width="24"
                height="24"
                alt=""
                style={iconInlineStyle}
              />
              {formatEventDate(event.date!, { includeYear: true })}
            </Text>
          </Row>

          <Row>
            <Text
              style={eventMetaLineStyle}
            >
              <Img
                src={`${baseUrl}/icons/time.png`}
                width="24"
                height="24"
                alt=""
                style={iconInlineStyle}
              />
              {event.time ? formatEventTime(event.time) : ''}
            </Text>
          </Row>

          {eventLocationLines.map((line, index) => (
            <Row
              key={index}
            >
              <Text
                style={{
                  ...eventMetaLineStyle,
                  margin: index === 0 ? '8px 0 0 0' : 0,
                  paddingLeft: index === 0 ? 0 : '32px',
                }}
              >
                {index === 0 && (
                  <Img
                    src={`${baseUrl}/icons/location.png`}
                    width="24"
                    height="24"
                    alt=""
                    style={iconInlineStyle}
                  />
                )}
                {line}
              </Text>
            </Row>
          ))}

          {event.location && (
            <Row>
              <Text
                style={{ ...eventMetaLineStyle, margin: '4px 0 0 0', paddingLeft: '32px' }}
              >
                <Link
                  href={getGoogleMapsSearchUrl(event.location)}
                  style={emailAccentLinkStyle}
                >
                  See location on Google Maps
                </Link>
              </Text>
            </Row>
          )}
        </Column>

        <Column
          style={{ paddingLeft: '16px', textAlign: 'right', verticalAlign: 'top' }}
        >
          <Img
            src={event.cover_image!}
            width="128"
            height="128"
            alt="Event cover image"
            style={{
              display: 'inline-block',
              width: '128px',
              height: '128px',
              borderRadius: '6px',
              objectFit: 'cover',
            }}
          />
        </Column>
      </Row>

      {!noDescription && event.description && (
        <Section
          style={{ marginTop: '24px' }}
        >
          <RichContent
            html={event.description}
          />
        </Section>
      )}
    </Section>
  );
}
