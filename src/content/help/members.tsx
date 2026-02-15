import type { FAQSection } from './types';

export const membersFAQ: FAQSection = {
  id: 'members',
  title: 'Members & discovery',
  items: [
    {
      id: 'discover-members',
      title: 'Discovering other members',
      content: (
        <>
          <p
            className="mb-3"
          >
            The Members page helps you find and connect with other photographers in the community. You can explore members by:
          </p>
          <ul
            className="ml-6 list-disc"
          >
            <li>
              <strong>
                Interests
              </strong>
              {' '}
              — Browse popular interests and see which members share your passions.
            </li>
            <li>
              <strong>
                Photo style
              </strong>
              {' '}
              — Discover photographers by the tags they use most often.
            </li>
            <li>
              <strong>
                Recent activity
              </strong>
              {' '}
              — See who has been sharing photos and albums recently.
            </li>
            <li>
              <strong>
                New members
              </strong>
              {' '}
              — Welcome the newest people who have joined the community.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'member-profiles',
      title: 'Viewing member profiles',
      content: (
        <p>
          Click on any member card to visit their profile. You can see their bio, interests, public photos, and albums. Profiles also show when they joined and their recent activity.
        </p>
      ),
    },
    {
      id: 'interests',
      title: 'How interests work',
      content: (
        <p>
          Interests are tags like &quot;street photography&quot; or &quot;landscape&quot; that members add to their profile during onboarding or from account settings. They help you find like-minded photographers. The Members page shows popular interests and groups members by shared interests so you can discover new people to follow.
        </p>
      ),
    },
    {
      id: 'photo-style-tags',
      title: 'Exploring by photo style',
      content: (
        <p>
          The &quot;Explore by photo style&quot; section shows popular photo tags used across the community. Click a tag to see all members who frequently use it — a great way to find photographers whose work matches styles you enjoy.
        </p>
      ),
    },
  ],
};
