import { routes } from '@/config/routes';
import Link from 'next/link';
import type { FAQSection } from './types';

export const photosFAQ: FAQSection = {
  id: 'photos',
  title: 'Photos & gallery',
  items: [
    {
      id: 'upload-photos',
      title: 'How to upload photos',
      content: (
        <>
          <p
            className="mb-3"
          >
            Go to Account → My photos. You can:
          </p>
          <ul>
            <li>
              Drag and drop photos onto the upload area
            </li>
            <li>
              Click to browse and select files from your device
            </li>
          </ul>
          <p>
            Supported formats include JPEG, PNG, GIF, and WebP. After uploading, you can add titles, descriptions, and tags, and organize photos into albums. To replay the interactive walkthrough, open the question-mark menu on My photos (or My albums) and choose Show guide.
          </p>
        </>
      ),
    },
    {
      id: 'manage-albums',
      title: 'Creating and managing albums',
      content: (
        <>
          <p
            className="mb-3"
          >
            Albums let you group related photos. To create one:
          </p>
          <ul>
            <li>
              Go to My photos (via your avatar menu) and switch to the Albums tab
            </li>
            <li>
              Click &quot;New album&quot; and give it a name and optional description
            </li>
            <li>
              Add photos from your library by selecting them and choosing &quot;Add to album&quot;
            </li>
          </ul>
          <p>
            You can reorder photos, change the cover image, and set album visibility (public or private).
          </p>
        </>
      ),
    },
    {
      id: 'shared-albums',
      title: 'Shared albums',
      content: (
        <>
          <p
            className="mb-3"
          >
            Shared albums let multiple people contribute photos to the same album. When creating a new album, expand the
            {' '}
            <strong>
              Album sharing
            </strong>
            {' '}
            section to enable sharing.
          </p>
          <p
            className="mb-3"
          >
            The
            {' '}
            <strong>
              Who can add photos
            </strong>
            {' '}
            setting controls access:
          </p>
          <ul>
            <li>
              <strong>
                Anyone
              </strong>
              {' '}
              — Anyone with the link can add photos without requesting access
            </li>
            <li>
              <strong>
                By request or invite
              </strong>
              {' '}
              — People must request to join or be invited before they can add photos
            </li>
          </ul>
          <p>
            You can also set a per-member photo limit. Event albums are automatically created as shared albums so attendees can contribute their photos.
          </p>
        </>
      ),
    },
    {
      id: 'photo-privacy',
      title: 'Photo visibility and privacy',
      content: (
        <p>
          Each photo and album can be set to
          {' '}
          <strong>
            public
          </strong>
          {' '}
          (visible to everyone) or
          {' '}
          <strong>
            private
          </strong>
          {' '}
          (only visible to you). Private photos won&apos;t appear in the gallery or on your public profile. You can change visibility anytime from the my photos or albums pages.
        </p>
      ),
    },
    {
      id: 'likes-comments',
      title: 'Liking and commenting on photos',
      content: (
        <p>
          You can like photos by clicking the heart icon and leave comments to share feedback. Reply to a comment to keep the conversation threaded — replies show who they&apos;re answering. You can edit your own comments after posting. The photo owner (and anyone you reply to) gets a notification. Be respectful and constructive.
        </p>
      ),
    },
    {
      id: 'member-mentions',
      title: 'Mentioning members (@nickname)',
      content: (
        <>
          <p
            className="mb-3"
          >
            In comments and in photo or album descriptions, type
            {' '}
            <strong>
              @
            </strong>
            {' '}
            followed by a member&apos;s nickname to mention them — for example
            {' '}
            <strong>
              @murtada
            </strong>
            . While you type, a short list of matching nicknames appears; use the arrow keys and Enter, or click a row, to insert the mention.
          </p>
          <p
            className="mb-3"
          >
            Published mentions link to that member&apos;s profile and show a preview when you hover. Editing the same text again does not send duplicate mention notifications. Hashtag tags on photos and albums (for example
            {' '}
            <strong>
              #street
            </strong>
            ) are separate from @mentions.
          </p>
          <p>
            If someone has turned off tagging in their account settings, you cannot pick them from the list and an @nickname in text stays plain (no link) until they opt back in. You can still @mention yourself when tagging is off for your account.
          </p>
        </>
      ),
    },
    {
      id: 'photo-member-tags',
      title: 'Tagging people on a photo',
      content: (
        <>
          <p
            className="mb-3"
          >
            Open
            {' '}
            <strong>
              Account → Photos
            </strong>
            , select a photo, and choose
            {' '}
            <strong>
              Tag people
            </strong>
            {' '}
            to open a larger view. Click a spot on the image, then choose a member from the nickname search. Each person can only appear once per photo; picking them again moves the dot. On the public photo page, tags show as dots on the image (hover for a profile card) and in the sidebar list — you cannot place new tags there.
          </p>
          <p
            className="mb-3"
          >
            Tagged members get an in-app notification (and an email if they keep
            {' '}
            <strong>
              Notifications
            </strong>
            {' '}
            on). Tagged members, owners, and admins can remove a tag from the photo page sidebar or from the manage sidebar.
          </p>
          <p>
            Tags are not shown in gallery grids or the fullscreen zoom view. Public photos you are tagged in appear in the
            {' '}
            <strong>
              Tagged
            </strong>
            {' '}
            section on your profile when the photo is visible to others.
          </p>
        </>
      ),
    },
    {
      id: 'sharing',
      title: 'Sharing photos and challenges',
      content: (
        <p>
          Photo, challenge, and event pages have a share button. Copy the link, or share to Facebook, X, WhatsApp, or Pinterest. On phones, you can also use your device&apos;s share sheet.
        </p>
      ),
    },
    {
      id: 'exif',
      title: 'EXIF data and camera info',
      content: (
        <>
          <p
            className="mb-3"
          >
            When you upload photos, we automatically extract EXIF data: camera, lens, settings, capture time, and GPS if the file includes it. Viewers see a compact summary on the photo page; tap
            {' '}
            <strong>
              See more
            </strong>
            {' '}
            for full details. If the photo has GPS coordinates, that includes a map and a link to open the location in Google Maps.
          </p>
          <p>
            You can edit capture details from
            {' '}
            <strong>
              My photos
            </strong>
            {' '}
            (select a photo and open Capture details). Change camera, lens, settings, or location — including choosing a point on a map. Select several photos to update capture details in bulk.
          </p>
        </>
      ),
    },
    {
      id: 'copyright-licensing',
      title: 'Copyright and licensing',
      content: (
        <p>
          You can set a license for each photo (e.g. All Rights Reserved, Creative Commons) to control how others may use it. You can also enable automatic watermarking and EXIF copyright embedding in Account settings.
          {' '}
          <Link
            href={routes.helpLicenses.url}
            className="text-primary hover:underline underline-offset-4"
          >
            Learn more about copyright and licensing
          </Link>
        </p>
      ),
    },
    {
      id: 'view-counts',
      title: 'View counts and trending',
      content: (
        <p>
          Photos and albums track view counts. The gallery homepage features &quot;Most viewed this week&quot; (popular photos from the last 7 days) and &quot;Trending albums&quot;. On the gallery Photos and Albums pages, use the
          {' '}
          <strong>
            Recent
          </strong>
          {' '}
          and
          {' '}
          <strong>
            Popular
          </strong>
          {' '}
          buttons to switch between newest first and most viewed.
        </p>
      ),
    },
    {
      id: 'bulk-editing',
      title: 'Bulk editing photos and albums',
      content: (
        <p>
          On the my photos and my albums pages, you can select multiple items (single or multi-select). Use the sidebar or action bar to edit, delete, or add photos to albums in bulk. This saves time when organizing large collections.
        </p>
      ),
    },
    {
      id: 'photo-library-filters',
      title: 'Filtering your photo library',
      content: (
        <p>
          On
          {' '}
          <strong>
            My photos
          </strong>
          , tap
          {' '}
          <strong>
            Filter
          </strong>
          {' '}
          to narrow your library by camera, lens, tags, albums, challenges, license, visibility, title, or upload date. You can also sort by custom order, upload date, or title. Filters stay applied until you clear them.
        </p>
      ),
    },
    {
      id: 'report-content',
      title: 'Reporting content',
      content: (
        <p>
          If you see inappropriate content, use the &quot;Report&quot; button on photos, albums, profiles, or comments. You&apos;ll be asked to provide a reason and details. Reports are reviewed by moderators, and you&apos;ll be notified when your report is resolved.
        </p>
      ),
    },
  ],
};
