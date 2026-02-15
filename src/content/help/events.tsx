import type { FAQSection } from './types';

export const eventsFAQ: FAQSection = {
  id: 'events',
  title: 'Events & meetups',
  items: [
    {
      id: 'join-events',
      title: 'How to find and join events',
      content: (
        <>
          <p
            className="mb-3"
          >
            Go to the Events page to see upcoming meetups. Click on an event to view details (date, time, location, description). If you&apos;re logged in, you can RSVP by clicking the &quot;Join event&quot; button.
          </p>
          <p>
            You need an account to RSVP. Your RSVP helps organizers plan and lets you add the event to your calendar.
          </p>
        </>
      ),
    },
    {
      id: 'what-to-expect',
      title: 'What to expect at a meetup',
      content: (
        <p>
          Our meetups vary — from casual photo walks to workshops and skill-sharing sessions. Check the event description for details. Bring your camera (or phone) and come ready to shoot and connect with other photographers. Most events are beginner-friendly.
        </p>
      ),
    },
    {
      id: 'rsvp',
      title: 'RSVP and attendance',
      content: (
        <p>
          RSVPing helps organizers know how many people to expect. You can cancel your RSVP anytime before the event. After the event, organizers mark who attended. Once marked, you&apos;ll see a &quot;You went!&quot; badge on the event — this helps you and others see your event history.
        </p>
      ),
    },
    {
      id: 'calendar',
      title: 'Adding events to your calendar',
      content: (
        <p>
          After RSVPing, you can add the event to your calendar. On the event page, use the &quot;Add this event to your calendar&quot; section to download or open the event in Google Calendar, Outlook, or Apple Calendar.
        </p>
      ),
    },
    {
      id: 'event-reminders',
      title: 'Event email reminders',
      content: (
        <p>
          We send automated email reminders: an RSVP reminder about 5 days before the event (if you haven&apos;t signed up yet) and an attendee reminder about 1 day before (if you&apos;ve confirmed you&apos;re going). You can opt out of these in your email preferences.
        </p>
      ),
    },
    {
      id: 'event-capacity',
      title: 'Event capacity and spots',
      content: (
        <p>
          Some events have a limited number of spots. The event page shows how many spots are filled (e.g. &quot;12 / 20 spots filled&quot;) or &quot;Event is full&quot; when no spots remain. RSVP early to reserve your spot.
        </p>
      ),
    },
  ],
};
