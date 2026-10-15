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
          <ul>
            <li>
              <strong>
                Interests
              </strong>
              {' '}
              — Browse popular interests and see which members share your passions.
            </li>
            <li>
              <strong>
                Shooting format &amp; gear
              </strong>
              {' '}
              — See who shoots digital, film, phone, and more, and browse members by their daily driver camera or lens.
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
                Recently active
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
          Click on any member card to visit their profile. You can see their bio, interests, public photos, and albums. Profiles also show when they joined and their achievements and stats.
        </p>
      ),
    },
    {
      id: 'interests',
      title: 'How interests work',
      content: (
        <p>
          Interests are tags like &quot;street photography&quot; or &quot;landscape&quot; that members add to their profile during onboarding or from account settings. They help you find like-minded photographers. The Members page shows popular interests and groups members by shared interests so you can discover like-minded photographers.
        </p>
      ),
    },
    {
      id: 'gear-discovery',
      title: 'Exploring by gear',
      content: (
        <p>
          Members can share shooting formats and daily driver gear on their profile. On the Members page, use &quot;Shoots on&quot; to find people who shoot the same way you do, and &quot;Daily drivers&quot; to see who uses the same camera bodies or lenses. Click a format or gear name on someone&apos;s profile to open the full member list for that choice.
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
