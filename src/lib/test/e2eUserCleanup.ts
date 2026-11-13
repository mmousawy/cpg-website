import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { isTestEmail } from '@/lib/auth/isTestEmail';

const AUTH_USERS_PAGE_SIZE = 1000;

export type E2eUserCleanupResult = {
  deleted: string[];
  notFound: string[];
  errors: string[];
};

/** Merge tracked run emails with optional orphan sweep targets (deduped, test-only). */
export function buildE2eCleanupEmailList(
  requestedEmails: string[] | undefined,
  orphanEmails: string[],
): string[] {
  const set = new Set<string>();
  for (const raw of requestedEmails ?? []) {
    const email = raw?.trim().toLowerCase();
    if (email && isTestEmail(email)) set.add(email);
  }
  for (const email of orphanEmails) {
    const normalized = email.trim().toLowerCase();
    if (isTestEmail(normalized)) set.add(normalized);
  }
  return [...set];
}

async function listPaginatedAuthUsers(
  adminClient: SupabaseClient<Database>,
): Promise<User[]> {
  const users: User[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PAGE_SIZE,
    });
    if (error) {
      throw error;
    }

    users.push(...data.users);
    if (data.users.length < AUTH_USERS_PAGE_SIZE) break;
    page += 1;
  }

  return users;
}

/** Every auth user whose email matches {@link isTestEmail} (paginated list). */
export async function listOrphanTestAuthEmails(
  adminClient: SupabaseClient<Database>,
): Promise<string[]> {
  const users = await listPaginatedAuthUsers(adminClient);
  const emails = new Set<string>();
  for (const user of users) {
    const email = user.email?.trim().toLowerCase();
    if (email && isTestEmail(email)) emails.add(email);
  }
  return [...emails];
}

export async function findAuthUserByEmail(
  adminClient: SupabaseClient<Database>,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const normalized = email.trim().toLowerCase();
  if (!isTestEmail(normalized)) return null;

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', normalized)
    .maybeSingle();

  if (profile?.id) {
    const { data: { user } } = await adminClient.auth.admin.getUserById(profile.id);
    if (user?.email) {
      return { id: user.id, email: user.email.toLowerCase() };
    }
  }

  const users = await listPaginatedAuthUsers(adminClient);
  const match = users.find((u) => u.email?.toLowerCase() === normalized);
  if (match?.email) {
    return { id: match.id, email: match.email.toLowerCase() };
  }

  return null;
}

export async function deleteE2eTestUser(
  adminClient: SupabaseClient<Database>,
  userId: string,
  email: string,
): Promise<string | null> {
  const { data: userPhotos } = await adminClient
    .from('photos')
    .select('id, storage_path')
    .eq('user_id', userId);

  const { data: userAlbums } = await adminClient
    .from('albums')
    .select('id')
    .eq('user_id', userId);

  const photoIds = userPhotos?.map((p) => p.id) ?? [];
  const albumIds = userAlbums?.map((a) => a.id) ?? [];

  if (albumIds.length > 0) {
    await adminClient.from('album_photos').delete().in('album_id', albumIds);
    await adminClient.from('album_tags').delete().in('album_id', albumIds);
    await adminClient.from('album_likes').delete().in('album_id', albumIds);
  }

  if (photoIds.length > 0) {
    await adminClient.from('photo_tags').delete().in('photo_id', photoIds);
    await adminClient.from('photo_likes').delete().in('photo_id', photoIds);
  }

  await adminClient.from('comments').delete().eq('user_id', userId);
  if (albumIds.length > 0) {
    await adminClient.from('comments').delete().in('album_id', albumIds);
  }
  if (photoIds.length > 0) {
    await adminClient.from('comments').delete().in('photo_id', photoIds);
  }

  await adminClient.from('photo_likes').delete().eq('user_id', userId);
  await adminClient.from('album_likes').delete().eq('user_id', userId);

  await adminClient.from('albums').delete().eq('user_id', userId);
  await adminClient.from('photos').delete().eq('user_id', userId);

  if (userPhotos && userPhotos.length > 0) {
    const storagePaths = userPhotos
      .filter((p) => p.storage_path)
      .map((p) => {
        const pathParts = p.storage_path!.split('/');
        const fileName = pathParts[pathParts.length - 1];
        return `${userId}/${fileName}`;
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

  for (const bucket of ['user-photos', 'user-avatars', 'user-banners'] as const) {
    const { data: remainingFiles } = await adminClient.storage.from(bucket).list(userId);
    if (remainingFiles && remainingFiles.length > 0) {
      const paths = remainingFiles.map((f) => `${userId}/${f.name}`);
      await adminClient.storage.from(bucket).remove(paths);
    }
  }

  await adminClient.from('notifications').delete().eq('user_id', userId);
  await adminClient.from('notifications').delete().eq('actor_id', userId);
  await adminClient.from('auth_tokens').delete().eq('user_id', userId);
  await adminClient.from('email_preferences').delete().eq('user_id', userId);
  await adminClient.from('profile_interests').delete().eq('profile_id', userId);
  await adminClient.from('events_rsvps').delete().eq('user_id', userId);
  await adminClient.from('profiles').delete().eq('id', userId);

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return deleteError.message;
  }

  const { data: remainingPhotos } = await adminClient
    .from('photos')
    .select('id')
    .eq('user_id', userId);
  const { data: remainingAlbums } = await adminClient
    .from('albums')
    .select('id')
    .eq('user_id', userId);
  const { data: remainingStorage } = await adminClient.storage.from('user-photos').list(userId);

  if (remainingPhotos?.length || remainingAlbums?.length || remainingStorage?.length) {
    return `Incomplete cleanup for ${email}: photos=${remainingPhotos?.length ?? 0}, albums=${remainingAlbums?.length ?? 0}, storage=${remainingStorage?.length ?? 0}`;
  }

  return null;
}

export async function cleanupE2eTestUsers(
  adminClient: SupabaseClient<Database>,
  options: { emails?: string[]; sweepOrphans?: boolean },
): Promise<E2eUserCleanupResult> {
  const orphanEmails = options.sweepOrphans
    ? await listOrphanTestAuthEmails(adminClient)
    : [];
  const emailsToDelete = buildE2eCleanupEmailList(options.emails, orphanEmails);

  const deleted: string[] = [];
  const notFound: string[] = [];
  const errors: string[] = [];

  for (const email of emailsToDelete) {
    try {
      const authUser = await findAuthUserByEmail(adminClient, email);
      if (!authUser) {
        notFound.push(email);
        continue;
      }

      const deleteError = await deleteE2eTestUser(adminClient, authUser.id, authUser.email);
      if (deleteError) {
        errors.push(deleteError.startsWith('Incomplete') || deleteError.startsWith('Failed')
          ? deleteError
          : `Failed to delete ${email}: ${deleteError}`);
      } else {
        deleted.push(authUser.email);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Failed to cleanup ${email}: ${message}`);
    }
  }

  return { deleted, notFound, errors };
}
