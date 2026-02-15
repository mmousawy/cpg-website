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
            Go to Account → Manage photos. You can:
          </p>
          <ul
            className="mb-4 ml-6 list-disc"
          >
            <li>
              Drag and drop photos onto the upload area
            </li>
            <li>
              Click to browse and select files from your device
            </li>
          </ul>
          <p>
            Supported formats include JPEG, PNG, GIF, and WebP. After uploading, you can add titles, descriptions, and tags, and organize photos into albums.
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
          <ul
            className="mb-4 ml-6 list-disc"
          >
            <li>
              Go to Account → Manage albums
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
          (only visible to you). Private photos won&apos;t appear in the gallery or on your public profile. You can change visibility anytime from the manage photos or albums pages.
        </p>
      ),
    },
    {
      id: 'likes-comments',
      title: 'Liking and commenting on photos',
      content: (
        <p>
          You can like photos by clicking the heart icon and leave comments to share feedback. Likes and comments are visible to the photo owner and other viewers. Be respectful and constructive in your comments.
        </p>
      ),
    },
    {
      id: 'exif',
      title: 'EXIF data and camera info',
      content: (
        <p>
          When you upload photos, we automatically extract EXIF data (camera, lens, settings, and GPS if available). This info is displayed to viewers on the photo detail page, so others can see how you captured the shot.
        </p>
      ),
    },
    {
      id: 'view-counts',
      title: 'View counts and trending',
      content: (
        <p>
          Photos and albums track view counts. The gallery page features &quot;Most viewed this week&quot; (popular photos from the last 7 days) and &quot;Trending albums&quot; so you can discover what the community is enjoying.
        </p>
      ),
    },
    {
      id: 'bulk-editing',
      title: 'Bulk editing photos and albums',
      content: (
        <p>
          On the manage photos and manage albums pages, you can select multiple items (single or multi-select). Use the sidebar or action bar to edit, delete, or add photos to albums in bulk. This saves time when organizing large collections.
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
