import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/database.types';

// This endpoint only works in development/test environments
// It cleans up test users created during E2E tests

export async function POST(request: Request) {
  // Only allow in development, test, or preview environments
  // VERCEL_ENV is 'preview' for PR deployments, 'production' for main branch
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const isDev = process.env.NODE_ENV !== 'production';
  const isCI = !!process.env.CI;

  if (!isDev && !isCI && !isPreview) {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 },
    );
  }

  try {
    const { emails } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'emails array is required' },
        { status: 400 },
      );
    }

    // Only allow cleanup of test emails (safety check)
    const testEmails = emails.filter((email: string) =>
      email.includes('test-e2e-') ||
      email.includes('@test.local') ||
      email.includes('test-signup-'),
    );

    if (testEmails.length === 0) {
      return NextResponse.json(
        { error: 'No valid test emails provided' },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 },
      );
    }

    const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const deleted: string[] = [];
    const errors: string[] = [];

    for (const email of testEmails) {
      // Find user by email
      const { data: users, error: listError } = await adminClient.auth.admin.listUsers();

      if (listError) {
        errors.push(`Failed to list users: ${listError.message}`);
        continue;
      }

      const user = users.users.find(u => u.email === email);

      if (user) {
        try {
          // Get user's photos to delete from storage (including soft-deleted ones)
          const { data: userPhotos } = await adminClient
            .from('photos')
            .select('id, storage_path')
            .eq('user_id', user.id);

          // Get user's album IDs (including soft-deleted ones)
          const { data: userAlbums } = await adminClient
            .from('albums')
            .select('id')
            .eq('user_id', user.id);

          const photoIds = userPhotos?.map(p => p.id) || [];
          const albumIds = userAlbums?.map(a => a.id) || [];

          // Delete all junction and related tables first
          if (albumIds.length > 0) {
            await adminClient.from('album_photos').delete().in('album_id', albumIds);
            await adminClient.from('album_tags').delete().in('album_id', albumIds);
            await adminClient.from('album_likes').delete().in('album_id', albumIds);
          }

          if (photoIds.length > 0) {
            await adminClient.from('photo_tags').delete().in('photo_id', photoIds);
            await adminClient.from('photo_likes').delete().in('photo_id', photoIds);
          }

          // Delete comments (by user or on user's content)
          await adminClient.from('comments').delete().eq('user_id', user.id);
          if (albumIds.length > 0) {
            await adminClient.from('comments').delete().in('album_id', albumIds);
          }
          if (photoIds.length > 0) {
            await adminClient.from('comments').delete().in('photo_id', photoIds);
          }

          // Delete likes made by this user
          await adminClient.from('photo_likes').delete().eq('user_id', user.id);
          await adminClient.from('album_likes').delete().eq('user_id', user.id);

          // Hard-delete albums (bypasses soft-delete)
          await adminClient.from('albums').delete().eq('user_id', user.id);

          // Hard-delete photos (bypasses soft-delete)
          await adminClient.from('photos').delete().eq('user_id', user.id);

          // Delete from storage
          if (userPhotos && userPhotos.length > 0) {
            const storagePaths = userPhotos
              .filter(p => p.storage_path)
              .map(p => {
                const pathParts = p.storage_path!.split('/');
                const fileName = pathParts[pathParts.length - 1];
                return `${user.id}/${fileName}`;
              });

            if (storagePaths.length > 0) {
              const { error: storageError } = await adminClient.storage
                .from('user-photos')
                .remove(storagePaths);
              if (storageError) {
                console.error(`Storage cleanup error for ${email}:`, storageError);
              }
            }
          }

          // Delete user's entire storage folder (catches any missed files)
          const { data: remainingFiles } = await adminClient.storage
            .from('user-photos')
            .list(user.id);
          if (remainingFiles && remainingFiles.length > 0) {
            const paths = remainingFiles.map(f => `${user.id}/${f.name}`);
            await adminClient.storage.from('user-photos').remove(paths);
          }

          // Delete notifications (sent to and from)
          await adminClient.from('notifications').delete().eq('user_id', user.id);
          await adminClient.from('notifications').delete().eq('actor_id', user.id);

          // Delete auth tokens
          await adminClient.from('auth_tokens').delete().eq('user_id', user.id);

          // Delete email preferences
          await adminClient.from('email_preferences').delete().eq('user_id', user.id);

          // Delete profile interests
          await adminClient.from('profile_interests').delete().eq('profile_id', user.id);

          // Delete event RSVPs
          await adminClient.from('events_rsvps').delete().eq('user_id', user.id);

          // Delete profile
          await adminClient.from('profiles').delete().eq('id', user.id);

          // Delete auth user
          const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

          if (deleteError) {
            errors.push(`Failed to delete ${email}: ${deleteError.message}`);
          } else {
            // Verify cleanup
            const { data: remainingPhotos } = await adminClient
              .from('photos')
              .select('id')
              .eq('user_id', user.id);
            const { data: remainingAlbums } = await adminClient
              .from('albums')
              .select('id')
              .eq('user_id', user.id);
            const { data: remainingStorage } = await adminClient.storage
              .from('user-photos')
              .list(user.id);

            if (remainingPhotos?.length || remainingAlbums?.length || remainingStorage?.length) {
              errors.push(`Incomplete cleanup for ${email}: photos=${remainingPhotos?.length || 0}, albums=${remainingAlbums?.length || 0}, storage=${remainingStorage?.length || 0}`);
            }

            deleted.push(email);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Failed to cleanup ${email}: ${message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
