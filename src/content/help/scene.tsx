import type { FAQSection } from './types';

export const sceneFAQ: FAQSection = {
  id: 'scene',
  title: 'Scene',
  items: [
    {
      id: 'what-is-scene',
      title: 'What is Scene?',
      content: (
        <p>
          Scene is our community-curated calendar of photography events happening in the wider world — exhibitions, photowalks, talks, workshops, festivals, meetups and more. Anyone can browse upcoming events, and logged-in members can add events they know about to share with the community.
        </p>
      ),
    },
    {
      id: 'add-scene-event',
      title: 'How to add an event',
      content: (
        <>
          <p
            className="mb-3"
          >
            On the Scene page, click the &quot;Add an event&quot; button. Fill in the event title, category, date, location, and any other details you have (website link, organizer, price). Your event goes live immediately — no approval needed.
          </p>
          <p>
            You can submit up to 5 events per day. Please only add real, public photography events. Submissions that don&apos;t meet our guidelines may be removed by moderators.
          </p>
        </>
      ),
    },
    {
      id: 'scene-vs-events',
      title: 'What\'s the difference between Scene and Events?',
      content: (
        <p>
          Events are official CPG meetups organized by the community admins — you can RSVP, get reminders, and share photos afterwards. Scene is for external events: exhibitions, festivals, workshops and other photography happenings that members want to share with each other. Think of Scene as &quot;things worth checking out&quot; and Events as &quot;things we&apos;re doing together.&quot;
        </p>
      ),
    },
    {
      id: 'scene-reporting',
      title: 'Reporting or removing a Scene event',
      content: (
        <p>
          If you see an event that&apos;s spam, inappropriate, or incorrect, you can report it using the Report button on the event&apos;s detail page. Moderators will review the report and may remove the event. If you submitted an event yourself, you can delete it from the event page.
        </p>
      ),
    },
  ],
};
