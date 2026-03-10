import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

const RETENTION_DAYS = 30;
const PHOTO_BATCH_SIZE = 100;

export async function GET(request: NextRequest) {
  // Verify cron secret from Authorization header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return NextResponse.json(
      { message: 'Cron secret not configured' },
      { status: 500 },
    );
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 },
    );
  }

  const supabase = createAdminClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  const cutoffISO = cutoffDate.toISOString();

  const results = {
    timestamp: new Date().toISOString(),
    retentionDays: RETENTION_DAYS,
    cutoffDate: cutoffISO,
    photos: { deleted: 0, storageDeleted: 0, failed: 0 },
    albums: { deleted: 0, failed: 0 },
    comments: { deleted: 0, failed: 0 },
    accounts: { deleted: 0, failed: 0 },
    errors: [] as string[],
  };

  try {
    // 1. Clean up soft-deleted photos (including storage files)
    let hasMorePhotos = true;

    while (hasMorePhotos) {
      const { data: deletedPhotos, error: photosQueryError } = await supabase
        .from('photos')
        .select('id, storage_path')
        .not('deleted_at', 'is', null)
        .lt('deleted_at', cutoffISO)
        .limit(PHOTO_BATCH_SIZE);

      if (photosQueryError) {
        results.errors.push(`Failed to query deleted photos: ${photosQueryError.message}`);
        break;
      }

      if (!deletedPhotos || deletedPhotos.length === 0) {
        hasMorePhotos = false;
        break;
      }

      // Delete storage files for this batch
      const storagePaths = deletedPhotos
        .map((p) => p.storage_path)
        .filter(Boolean);

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('user-photos')
          .remove(storagePaths);

        if (storageError) {
          results.errors.push(`Storage deletion error: ${storageError.message}`);
        } else {
          results.photos.storageDeleted += storagePaths.length;
        }
      }

      // Hard-delete the photo records
      const photoIds = deletedPhotos.map((p) => p.id);
      const { error: deleteError } = await supabase
        .from('photos')
        .delete()
        .in('id', photoIds);

      if (deleteError) {
        results.errors.push(`Failed to hard-delete photos: ${deleteError.message}`);
        results.photos.failed += photoIds.length;
      } else {
        results.photos.deleted += photoIds.length;
      }

      // If we got fewer than the batch size, we're done
      if (deletedPhotos.length < PHOTO_BATCH_SIZE) {
        hasMorePhotos = false;
      }
    }

    // 2. Clean up soft-deleted albums
    const { data: deletedAlbums, error: albumsQueryError } = await supabase
      .from('albums')
      .select('id')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffISO);

    if (albumsQueryError) {
      results.errors.push(`Failed to query deleted albums: ${albumsQueryError.message}`);
    } else if (deletedAlbums && deletedAlbums.length > 0) {
      const albumIds = deletedAlbums.map((a) => a.id);
      const { error: deleteError } = await supabase
        .from('albums')
        .delete()
        .in('id', albumIds);

      if (deleteError) {
        results.errors.push(`Failed to hard-delete albums: ${deleteError.message}`);
        results.albums.failed += albumIds.length;
      } else {
        results.albums.deleted += albumIds.length;
      }
    }

    // 3. Clean up soft-deleted comments
    const { data: deletedComments, error: commentsQueryError } = await supabase
      .from('comments')
      .select('id')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffISO);

    if (commentsQueryError) {
      results.errors.push(`Failed to query deleted comments: ${commentsQueryError.message}`);
    } else if (deletedComments && deletedComments.length > 0) {
      const commentIds = deletedComments.map((c) => c.id);
      const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .in('id', commentIds);

      if (deleteError) {
        results.errors.push(`Failed to hard-delete comments: ${deleteError.message}`);
        results.comments.failed += commentIds.length;
      } else {
        results.comments.deleted += commentIds.length;
      }
    }

    // 4. Purge accounts scheduled for deletion past retention period
    const { data: scheduledProfiles, error: profilesQueryError } = await supabase
      .from('profiles')
      .select('id, email, avatar_url')
      .not('deletion_scheduled_at', 'is', null)
      .lt('deletion_scheduled_at', cutoffISO);

    if (profilesQueryError) {
      results.errors.push(`Failed to query scheduled profiles: ${profilesQueryError.message}`);
    } else if (scheduledProfiles && scheduledProfiles.length > 0) {
      for (const profile of scheduledProfiles) {
        try {
          // a) Soft-delete all owned photos (so next cron cycle cleans up storage)
          const { error: softDeletePhotosError } = await supabase
            .from('photos')
            .update({ deleted_at: new Date().toISOString() })
            .eq('user_id', profile.id)
            .is('deleted_at', null);

          if (softDeletePhotosError) {
            results.errors.push(`Failed to soft-delete photos for ${profile.id}: ${softDeletePhotosError.message}`);
          }

          // b) Remove contributed album_photos from shared albums
          const { error: albumPhotosError } = await supabase
            .from('album_photos')
            .delete()
            .eq('added_by', profile.id);

          if (albumPhotosError) {
            results.errors.push(`Failed to remove contributed album_photos for ${profile.id}: ${albumPhotosError.message}`);
          }

          // c) Nullify blocking FK references
          await supabase
            .from('challenge_announcements')
            .update({ announced_by: null } as never)
            .eq('announced_by', profile.id);

          await supabase
            .from('challenge_submissions')
            .update({ reviewed_by: null } as never)
            .eq('reviewed_by', profile.id);

          await supabase
            .from('challenges')
            .update({ created_by: null } as never)
            .eq('created_by', profile.id);

          await supabase
            .from('event_announcements')
            .update({ announced_by: null } as never)
            .eq('announced_by', profile.id);

          await supabase
            .from('albums')
            .update({ suspended_by: null } as never)
            .eq('suspended_by', profile.id);

          // d) Delete avatar files from storage
          if (profile.avatar_url) {
            try {
              const { data: avatarFiles } = await supabase.storage
                .from('avatars')
                .list(profile.id);

              if (avatarFiles && avatarFiles.length > 0) {
                const avatarPaths = avatarFiles.map((f) => `${profile.id}/${f.name}`);
                await supabase.storage.from('avatars').remove(avatarPaths);
              }
            } catch {
              results.errors.push(`Failed to delete avatar files for ${profile.id}`);
            }
          }

          // e) Delete auth user (cascades profile + all related records)
          const { error: authDeleteError } = await supabase.auth.admin.deleteUser(profile.id);

          if (authDeleteError) {
            results.errors.push(`Failed to delete auth user ${profile.id}: ${authDeleteError.message}`);
            results.accounts.failed += 1;
          } else {
            results.accounts.deleted += 1;
          }
        } catch (accountError) {
          results.errors.push(`Error purging account ${profile.id}: ${accountError instanceof Error ? accountError.message : 'Unknown error'}`);
          results.accounts.failed += 1;
        }
      }
    }

    console.log('Cleanup completed:', JSON.stringify(results, null, 2));

    return NextResponse.json({
      message: 'Cleanup completed',
      results,
    });
  } catch (error) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json(
      {
        message: 'Cleanup failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 },
    );
  }
}
