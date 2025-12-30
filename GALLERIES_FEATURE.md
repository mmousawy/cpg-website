# Photo Albums Feature

## Overview

This feature allows users to create and manage their own photo albums. Albums can be made public (visible to everyone) or private (visible only to the owner).

## Routes

### Public Routes

- `/galleries` - Browse all public albums created by community members
- `/galleries/[nickname]/[albumSlug]` - View a specific public album with all its photos

### Protected Routes (Requires Authentication)

- `/account/galleries` - Manage your own albums
- `/account/galleries/new` - Create a new album
- `/account/galleries/[albumSlug]` - Edit an existing album and manage photos

## User Nicknames

Nicknames are used as user identifiers in gallery URLs instead of user IDs for better readability and SEO.

- Nicknames are **required** during account registration
- Nicknames are **unique** and **cannot be changed** after creation
- Nicknames must contain only lowercase letters, numbers, and hyphens
- Nicknames are auto-generated from the full name during signup but can be customized
- Gallery URLs use the format: `/galleries/[nickname]/[album-slug]`

## Database Schema

### Tables

#### `albums`

- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to profiles table
- `title` (TEXT) - Album title
- `slug` (TEXT) - URL-friendly slug (unique per user)
- `description` (TEXT, nullable) - Album description
- `cover_image_url` (TEXT, nullable) - Cover image URL
- `is_public` (BOOLEAN) - Whether the album is publicly visible
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

#### `album_photos`

- `id` (UUID) - Primary key
- `album_id` (UUID) - Foreign key to albums table
- `photo_url` (TEXT) - Photo URL in storage
- `title` (TEXT, nullable) - Photo title
- `description` (TEXT, nullable) - Photo description
- `width` (INTEGER, nullable) - Photo width in pixels
- `height` (INTEGER, nullable) - Photo height in pixels
- `sort_order` (INTEGER) - Display order
- `created_at` (TIMESTAMPTZ) - Upload timestamp

## Storage Structure

Photos are stored in the `user-albums` Supabase Storage bucket with the following structure:

```
user-albums/
  ├── [user-id]/
  │   ├── [album-id]/
  │   │   ├── [photo-1-uuid].jpg
  │   │   ├── [photo-2-uuid].png
  │   │   └── ...
```

## Setup Instructions

### 1. Database Migration

Run the SQL migration file to create the necessary tables:

```bash
# In Supabase Dashboard -> SQL Editor, run:
supabase/migrations/create_albums.sql
```

This will also add a unique constraint on the `nickname` field in the profiles table.

### 2. Storage Bucket Setup

Create the `user-albums` storage bucket in Supabase:

1. Go to Storage in Supabase Dashboard
2. Create a new bucket named `user-albums`
3. Set it as **Public** (so public albums can be viewed)
4. Configure storage policies (see storage-policies.sql)

### 3. Update Database Types

After running migrations, regenerate the TypeScript types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/database.types.ts
```

## Features

### Album Management

- Create new albums with title, slug, description
- Toggle public/private visibility
- Edit album details
- Delete albums (with all photos)
- Auto-generated slugs from titles

### Photo Management

- Upload multiple photos at once
- Automatic image dimension detection
- Photo reordering with sort_order
- Delete individual photos
- Drag-and-drop support (future enhancement)

### Photo Gallery

- Masonry grid layout
- PhotoSwipe lightbox for viewing
- Responsive design
- Image lazy loading

## Components

### AlbumCard

Displays album preview with cover image, title, description, and photo count. Used in gallery listings.

### AlbumGallery

Renders album photos in a masonry grid with PhotoSwipe lightbox integration. Includes image metadata (width/height) for optimal display.

## Security

### Row Level Security (RLS)

- Public albums are viewable by everyone
- Private albums are only viewable by their owner
- Only album owners can modify or delete their albums
- Only album owners can add/edit/delete photos in their albums

### Storage Security

- Photos are organized by user ID and album ID
- Storage policies ensure users can only upload to their own folders
- Public bucket allows viewing public album photos

## File Validation

- Accepted formats: JPEG, PNG, GIF, WebP
- Maximum file size: 10MB per photo
- Avatar maximum: 5MB

## Future Enhancements

- Drag-and-drop photo reordering
- Album categories/tags
- Photo captions and metadata
- Comments on photos/albums
