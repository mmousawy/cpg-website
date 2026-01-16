# Metadata Implementation Guide

This document describes how metadata, OpenGraph, and Twitter cards are implemented in the Creative Photography Group website.

## Overview

We use Next.js's built-in metadata API with `generateMetadata` for dynamic pages and static `metadata` exports for static pages. All metadata is generated using shared utilities from `src/utils/metadata.ts` to ensure consistency across the site.

## Architecture

### Shared Utilities (`src/utils/metadata.ts`)

The metadata utilities provide:

- **`siteConfig`**: Site-wide constants (name, description, URL)
- **`createMetadata()`**: Main function to generate complete metadata objects with OpenGraph and Twitter cards
- **`createNoIndexMetadata()`**: Convenience function for pages that shouldn't be indexed (auth, admin, etc.)
- **`truncateDescription()`**: Helper to truncate descriptions to optimal SEO length (155 chars)
- **`getAbsoluteUrl()`**: Helper to convert relative paths to absolute URLs

### Root Layout (`src/app/layout.tsx`)

The root layout sets:
- `metadataBase`: Base URL for all relative metadata URLs
- Title template: `"%s - Creative Photography Group"` (automatically appends to child page titles)
- Default OpenGraph configuration
- Default Twitter card configuration
- Default robots configuration

## Usage Patterns

### Static Pages

For pages with static content, export a `metadata` object:

```typescript
import { createMetadata } from '@/utils/metadata';

export const metadata = createMetadata({
  title: 'Page Title',
  description: 'Page description for SEO and social sharing',
  canonical: '/page-url',
  keywords: ['keyword1', 'keyword2'],
});
```

### Dynamic Pages

For pages with dynamic content (using route parameters), export a `generateMetadata` function:

```typescript
import { createMetadata } from '@/utils/metadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const data = await fetchData(resolvedParams.id);

  if (!data) {
    return createMetadata({
      title: 'Not Found',
      description: 'The requested content could not be found',
    });
  }

  return createMetadata({
    title: data.title,
    description: data.description,
    image: data.imageUrl, // Will fall back to default if null
    canonical: `/path/${resolvedParams.id}`,
    type: 'article',
  });
}
```

### Pages That Shouldn't Be Indexed

For authentication pages, admin pages, or other pages that shouldn't appear in search results:

```typescript
import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Log in',
  description: 'Log in to your account',
});
```

This automatically sets `robots: { index: false, follow: false }`.

## OpenGraph Images

### Default Images

The site uses default OpenGraph images:
- `/opengraph-image.jpg` - Default OG image
- `/twitter-image.jpg` - Default Twitter card image

These are defined in `src/utils/metadata.ts` and automatically used when no specific image is provided.

### Dynamic Images

For pages with dynamic content, pass the image URL to `createMetadata()`:

```typescript
return createMetadata({
  title: 'Event Title',
  description: 'Event description',
  image: event.cover_image || event.image_url, // Falls back to default if null
});
```

The `image` parameter accepts:
- `null` or `undefined`: Uses default site image
- Relative path (e.g., `/images/photo.jpg`): Converted to absolute URL
- Absolute URL (e.g., `https://example.com/image.jpg`): Used as-is

### Image Sources by Page Type

| Page Type | Image Source | Fallback |
|-----------|--------------|----------|
| Events | `event.cover_image` or `event.image_url` | Default OG image |
| Profiles | `profile.avatar_url` | Default OG image |
| Albums | `album.cover_image_url` | Default OG image |
| Photos | `photo.url` | Default OG image |

## Metadata Fields

### Required Fields

- **`title`**: Page title (will be appended with site name via template)
- **`description`**: Page description (automatically truncated to 155 chars)

### Optional Fields

- **`image`**: OpenGraph/Twitter image URL (relative or absolute)
- **`canonical`**: Canonical URL for the page (relative path)
- **`keywords`**: Array of keywords for SEO
- **`type`**: OpenGraph type (`'website'` | `'article'` | `'profile'`)
- **`noindex`**: Boolean to prevent indexing (use `createNoIndexMetadata` instead)
- **`publishedTime`**: Publication date for articles
- **`modifiedTime`**: Last modified date for articles
- **`authors`**: Array of author names

## Examples

### Example 1: Static Public Page

```typescript
// src/app/events/page.tsx
import { createMetadata } from '@/utils/metadata';

export const metadata = createMetadata({
  title: 'Events',
  description: 'Browse upcoming and past photography meetups and photo walks.',
  canonical: '/events',
  keywords: ['photography events', 'meetups', 'photo walks'],
});
```

### Example 2: Dynamic Page with Image

```typescript
// src/app/events/[eventSlug]/page.tsx
export async function generateMetadata({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params;
  const { event } = await getEventBySlug(resolvedParams.eventSlug);

  if (!event) {
    return createMetadata({
      title: 'Event not found',
      description: 'The requested event could not be found',
    });
  }

  return createMetadata({
    title: event.title,
    description: event.description || `Join us for ${event.title}`,
    image: event.cover_image || event.image_url,
    canonical: `/events/${resolvedParams.eventSlug}`,
    type: 'article',
  });
}
```

### Example 3: Protected Page (No Index)

```typescript
// src/app/account/layout.tsx
import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Account',
  description: 'Manage your account settings',
});
```

## Best Practices

1. **Always use the utilities**: Use `createMetadata()` or `createNoIndexMetadata()` instead of manually creating metadata objects
2. **Provide descriptions**: Always include a meaningful description (will be truncated automatically)
3. **Use canonical URLs**: Include canonical URLs for all public pages to avoid duplicate content issues
4. **Add images when available**: Pass image URLs for dynamic content to improve social sharing
5. **Handle missing data**: Always handle cases where dynamic data might not exist (404 cases)
6. **Use appropriate types**: Use `'article'` for blog posts/events, `'profile'` for user profiles, `'website'` for general pages
7. **Keywords sparingly**: Only add keywords when they're genuinely relevant to the page content

## SEO Considerations

- **Title length**: Keep titles under 60 characters for optimal display in search results
- **Description length**: Descriptions are automatically truncated to 155 characters (optimal for search snippets)
- **Image dimensions**: OG images should be 1200x630px for best results
- **Canonical URLs**: Always set canonical URLs to prevent duplicate content penalties
- **Robots meta**: Use `createNoIndexMetadata()` for pages that shouldn't be indexed (auth, admin, etc.)

## Testing

To verify metadata is working correctly:

1. **View page source**: Check that `<meta>` tags are present in the HTML
2. **OpenGraph Debugger**: Use [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/) to test OG tags
3. **Twitter Card Validator**: Use [Twitter's Card Validator](https://cards-dev.twitter.com/validator) to test Twitter cards
4. **Google Rich Results Test**: Use [Google's Rich Results Test](https://search.google.com/test/rich-results) to verify structured data

## File Locations

- **Utilities**: `src/utils/metadata.ts`
- **Root layout**: `src/app/layout.tsx`
- **Page metadata**: Each page file (`src/app/**/page.tsx` or `layout.tsx`)

## References

- [Next.js Metadata API Documentation](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [OpenGraph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
