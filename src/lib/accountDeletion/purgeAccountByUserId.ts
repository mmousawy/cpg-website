import type { Json } from '@/database.types';
import { retainSuspendedFingerprintForProfileId } from '@/lib/accountDeletion/retainSuspendedFingerprint';
import { createAdminClient } from '@/utils/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/database.types';

const EMAIL_ASSETS_BUCKET = 'email-assets';

function stripActorFieldsFromData(data: Json | null): Json | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return data;
  const next = { ...data } as Record<string, unknown>;
  if ('actorName' in next) next.actorName = null;
  if ('actorNickname' in next) next.actorNickname = null;
  if ('actorAvatar' in next) next.actorAvatar = null;
  return next as unknown as Json;
}

function scrubEmailBatchItem(
  item: unknown,
  userId: string,
  emailNorm: string | null,
  nickname: string | null,
): unknown {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return item;
  const o = item as Record<string, unknown>;
  const out = { ...o };

  if (typeof o.userId === 'string' && o.userId === userId) {
    out.userId = null;
  }
  if (typeof o.memberId === 'string' && o.memberId === userId) {
    out.memberId = null;
  }
  if (typeof o.submitterId === 'string' && o.submitterId === userId) {
    out.submitterId = null;
  }

  for (const [k, v] of Object.entries(out)) {
    if (typeof v !== 'string') continue;
    const lower = k.toLowerCase();
    const looksPersonal = lower.includes('email')
      || lower.includes('nickname')
      || lower.includes('avatar')
      || lower.endsWith('name');
    if (!looksPersonal) continue;
    const vNorm = v.trim().toLowerCase();
    const matchesEmail = Boolean(emailNorm && vNorm === emailNorm);
    const matchesNick = Boolean(nickname && v.trim() === nickname);
    if (matchesEmail || matchesNick) {
      out[k] = null;
    }
  }

  return out;
}

export type PurgeAccountOptions = {
  /** Copy signup + profile link data for repeat detection (suspended / bot path). */
  retainSuspendedFingerprint?: boolean;
};

/**
 * Full account purge before `auth.admin.deleteUser`: anonymize leftovers, soft-delete photos, storage, FK nulls.
 */
export async function purgeAccountByUserId(
  userId: string,
  options: PurgeAccountOptions = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, nickname, full_name, avatar_url, banner_url, suspended_at')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, error: profileError?.message ?? 'Profile not found' };
  }

  const emailNorm = profile.email?.trim().toLowerCase() ?? null;
  const nickname = profile.nickname?.trim() || null;

  const { data: sourceRow } = await supabase
    .from('profiles')
    .select('deletion_source')
    .eq('id', userId)
    .maybeSingle();

  const deletionSource = sourceRow?.deletion_source ?? null;
  const retain =
    options.retainSuspendedFingerprint === true
    || deletionSource === 'suspension'
    || profile.suspended_at != null;

  if (retain) {
    await retainSuspendedFingerprintForProfileId(userId);
  }

  await supabase.from('events_rsvps').update({ name: null, email: null }).eq('user_id', userId);
  await supabase.from('feedback').update({ name: null, email: null }).eq('user_id', userId);
  await supabase.from('reports').update({ reporter_name: null, reporter_email: null }).eq('reporter_id', userId);

  // Feedback screenshots
  const { data: feedbackRows } = await supabase
    .from('feedback')
    .select('id, screenshots')
    .eq('user_id', userId);
  const pathsToRemove: string[] = [];
  for (const row of feedbackRows ?? []) {
    const shots = row.screenshots;
    if (Array.isArray(shots)) {
      for (const url of shots) {
        if (typeof url !== 'string') continue;
        const marker = '/feedback/';
        const idx = url.indexOf(marker);
        if (idx >= 0) {
          pathsToRemove.push(url.slice(idx + marker.length));
        }
      }
    }
  }
  if (pathsToRemove.length > 0) {
    await supabase.storage.from(EMAIL_ASSETS_BUCKET).remove(pathsToRemove);
    await supabase.from('feedback').update({ screenshots: [] }).eq('user_id', userId);
  }

  await scrubNotificationsForActor(supabase, userId, emailNorm, nickname);

  const { error: softDeletePhotosError } = await supabase
    .from('photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (softDeletePhotosError) {
    return { ok: false, error: `Failed to soft-delete photos: ${softDeletePhotosError.message}` };
  }

  await supabase.from('album_photos').delete().eq('added_by', userId);

  await supabase.from('challenge_announcements').update({ announced_by: null } as never).eq('announced_by', userId);
  await supabase.from('challenge_submissions').update({ reviewed_by: null } as never).eq('reviewed_by', userId);
  await supabase.from('challenges').update({ created_by: null } as never).eq('created_by', userId);
  await supabase.from('event_announcements').update({ announced_by: null } as never).eq('announced_by', userId);
  await supabase.from('albums').update({ suspended_by: null } as never).eq('suspended_by', userId);

  for (const bucket of ['user-avatars', 'user-banners'] as const) {
    const hasFile = bucket === 'user-avatars' ? profile.avatar_url : profile.banner_url;
    if (!hasFile) continue;
    try {
      const { data: files } = await supabase.storage.from(bucket).list(userId);
      if (files && files.length > 0) {
        await supabase.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch {
      console.error(`purgeAccountByUserId: failed listing ${bucket} for`, userId);
    }
  }

  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    return { ok: false, error: `Failed to delete auth user: ${authDeleteError.message}` };
  }

  return { ok: true };
}

async function scrubNotificationsForActor(
  supabase: SupabaseClient<Database>,
  userId: string,
  emailNorm: string | null,
  nickname: string | null,
): Promise<void> {
  const { data: notifRows, error: nErr } = await supabase
    .from('notifications')
    .select('id, data')
    .eq('actor_id', userId);
  if (nErr) {
    console.error('scrubNotifications notifications:', nErr);
  } else {
    for (const row of notifRows ?? []) {
      const nextData = stripActorFieldsFromData(row.data);
      await supabase.from('notifications').update({ data: nextData }).eq('id', row.id);
    }
  }

  const { data: pendRows, error: pErr } = await supabase
    .from('pending_notifications')
    .select('dedupe_key, recipient_user_id, notification_data')
    .eq('actor_id', userId);
  if (pErr) {
    console.error('scrubNotifications pending:', pErr);
  } else {
    for (const row of pendRows ?? []) {
      const next = stripActorFieldsFromData(row.notification_data as Json);
      await supabase
        .from('pending_notifications')
        .update({ notification_data: next })
        .eq('dedupe_key', row.dedupe_key)
        .eq('recipient_user_id', row.recipient_user_id);
    }
  }

  const { data: batches, error: bErr } = await supabase
    .from('notification_email_batches')
    .select('id, items')
    .eq('status', 'pending')
    .limit(500);
  if (bErr) {
    console.error('scrubNotifications batches:', bErr);
    return;
  }

  for (const batch of batches ?? []) {
    const raw = batch.items;
    if (!Array.isArray(raw)) continue;
    let changed = false;
    const nextItems = raw.map((item) => {
      const scrubbed = scrubEmailBatchItem(item, userId, emailNorm, nickname);
      if (scrubbed !== item) changed = true;
      return scrubbed;
    });
    if (changed) {
      await supabase.from('notification_email_batches').update({ items: nextItems as unknown as Json }).eq('id', batch.id);
    }
  }
}
