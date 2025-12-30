# Photo Galleries Feature - Setup Guide

## Quick Start

This feature has been fully implemented! Follow these steps to set it up in your Supabase project:

## 1. Database Setup

Run the migration SQL in your Supabase project:

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/create_albums.sql`
4. Click **Run**

This will create:
- `albums` table
- `album_photos` table
- Indexes for performance
- Row Level Security (RLS) policies

## 2. Storage Setup

### Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Name: `user-albums`
4. Set as **Public** bucket
5. Click **Create bucket**

### Apply Storage Policies

1. Click on the `user-albums` bucket
2. Go to **Policies** tab
3. Copy and paste each policy from `supabase/storage-policies.sql`
4. Click **Review** and **Save policy** for each one

## 3. Update TypeScript Types (Optional)

If you want to regenerate the database types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/database.types.ts
```

Note: The types have already been updated in `src/database.types.ts`, so this step is optional.

## 4. Restart Development Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

The TypeScript errors you might see will resolve after restarting.

## Features Implemented

✅ **Routes Updated**
- Changed `/past-meetups` → `/galleries` in routes config
- Added `/account/galleries` route for user management

✅ **Pages Created**
- `/galleries` - Public gallery overview
- `/galleries/[userId]/[albumSlug]` - Public album view
- `/account/galleries` - User's album management
- `/account/galleries/new` - Create new album
- `/account/galleries/[albumSlug]` - Edit album & manage photos

✅ **Components Created**
- `AlbumCard` - Album preview card
- `AlbumGallery` - Photo grid with lightbox

✅ **Database Schema**
- Albums table with RLS policies
- Album photos table with RLS policies
- Proper indexes for performance

✅ **File Upload**
- Same pattern as avatar uploads
- Organized by user ID and album ID
- 10MB max per photo
- JPEG, PNG, GIF, WebP support

✅ **Navigation Updated**
- Header now shows "Galleries" link
- Mobile menu updated
- User menu includes "My Galleries"

## Testing Checklist

- [ ] Run database migration
- [ ] Create storage bucket with policies
- [ ] Restart dev server
- [ ] Log in to your account
- [ ] Create a new album
- [ ] Upload photos to the album
- [ ] Toggle album visibility (public/private)
- [ ] View your album in public galleries
- [ ] Edit album details
- [ ] Delete photos
- [ ] Delete album

## Folder Structure

```
src/
├── app/
│   ├── galleries/
│   │   ├── page.tsx (public gallery overview)
│   │   └── [userId]/
│   │       └── [albumSlug]/
│   │           └── page.tsx (public album view)
│   └── account/
│       └── galleries/
│           ├── page.tsx (user's galleries list)
│           └── [albumSlug]/
│               └── page.tsx (edit album)
├── components/
│   ├── AlbumCard.tsx
│   └── AlbumGallery.tsx
├── types/
│   └── albums.ts
└── database.types.ts (updated)
```

## Notes

- The `/past-meetups` route still exists and will show past events
- Storage structure: `user-albums/[user-id]/[album-id]/[photo-uuid].ext`
- Photos are automatically resized on the frontend for optimal display
- Cover images are automatically set to the first uploaded photo
- RLS ensures users can only modify their own albums
- Public albums are visible to everyone, private albums only to the owner

## Troubleshooting

**TypeScript errors about missing components?**
- Restart your TypeScript server or dev server

**Can't upload photos?**
- Make sure the `user-albums` bucket exists and is public
- Check storage policies are applied correctly

**Database errors?**
- Verify the migration SQL ran successfully
- Check RLS policies are enabled

**Photos not showing?**
- Check that the album is set to public
- Verify storage bucket is public
- Check browser console for errors

Need help? Check `GALLERIES_FEATURE.md` for detailed documentation.
