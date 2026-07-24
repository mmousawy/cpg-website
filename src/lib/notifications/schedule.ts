import type { Json } from '@/database.types';
import { createNotification } from '@/lib/notifications/create';
import {
  enqueueCommentNotificationEmail,
  type QueuedCommentEmailItem,
} from '@/lib/notifications/emailQueue';
import type {
  CreateNotificationParams,
  NotificationData,
  NotificationEntityType,
  NotificationType,
} from '@/types/notifications';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidateTag } from 'next/cache';
import { after } from 'next/server';

export const NOTIFICATION_DELAY_MS = 30_000;
const FOLLOWED_UPLOAD_COALESCE_MS = 24 * 60 * 60 * 1000;
const FLUSH_BATCH_LIMIT = 200;

const ENTITY_SCOPED_TYPES = new Set<NotificationType>([
  'like_photo',
  'like_album',
  'comment_photo',
  'comment_album',
  'comment_event',
  'comment_challenge',
  'comment_scene_event',
]);

const UNDISMISSED_DEDUPE_TYPES = new Set<NotificationType>([
  'follow',
  'like_photo',
  'like_album',
  'shared_album_invite_received',
  'shared_album_request_received',
  'shared_album_request_accepted',
  'shared_album_request_declined',
  'shared_album_invite_accepted',
]);

type ActorEntry = {
  id: string;
  name?: string | null;
  nickname?: string | null;
  avatar?: string | null;
};

export type PendingEmailPayload = QueuedCommentEmailItem & {
  batchEntityType?: string;
};

type InternalNotificationData = NotificationData & {
  _pendingEmail?: PendingEmailPayload;
  actorIds?: string[];
  actors?: ActorEntry[];
  otherCount?: number;
  commentCount?: number;
  photoCount?: number;
};

export type ScheduleNotificationParams = CreateNotificationParams & {
  dedupeKey?: string;
  coalesceIncrement?: { field: 'commentCount' | 'photoCount'; by?: number };
  pendingEmail?: PendingEmailPayload;
  validateAction?: 'follow' | 'like_photo' | 'like_album';
};

export type FlushPendingNotificationsResult = {
  delivered: number;
  failed: number;
  processed: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildNotificationDedupeKey(params: {
  type: NotificationType;
  recipientUserId: string;
  actorId?: string | null;
  entityType: string;
  entityId?: string | null;
}): string {
  if (ENTITY_SCOPED_TYPES.has(params.type)) {
    return `${params.type}:${params.recipientUserId}:${params.entityType}:${params.entityId ?? ''}`;
  }

  const actorSegment = params.actorId ?? 'none';
  return `${params.type}:${params.recipientUserId}:${actorSegment}:${params.entityType}:${params.entityId ?? ''}`;
}

function buildActorEntry(
  actorId: string,
  data?: NotificationData,
): ActorEntry {
  return {
    id: actorId,
    name: data?.actorName ?? null,
    nickname: data?.actorNickname ?? null,
    avatar: data?.actorAvatar ?? null,
  };
}

function stripInternalFields(data: InternalNotificationData): NotificationData {
  const { _pendingEmail, actorIds, actors, ...rest } = data;
  return rest;
}

function applyCoalesceIncrement(
  data: InternalNotificationData,
  coalesceIncrement?: ScheduleNotificationParams['coalesceIncrement'],
): InternalNotificationData {
  if (!coalesceIncrement) {
    return data;
  }

  const { field, by = 1 } = coalesceIncrement;
  const previous = typeof data[field] === 'number' ? data[field]! : 0;
  return { ...data, [field]: previous + by };
}

function mergeActorIntoPendingData(
  existing: InternalNotificationData,
  actorId: string,
  incoming: InternalNotificationData,
  coalesceIncrement?: ScheduleNotificationParams['coalesceIncrement'],
): InternalNotificationData {
  const actors = [...(existing.actors ?? [])];
  const existingIndex = actors.findIndex((actor) => actor.id === actorId);
  const actorEntry = buildActorEntry(actorId, incoming);

  if (existingIndex >= 0) {
    actors[existingIndex] = actorEntry;
  } else {
    actors.push(actorEntry);
  }

  const actorIds = actors.map((actor) => actor.id);
  const primary = actors[actors.length - 1]!;

  let merged: InternalNotificationData = {
    ...existing,
    ...incoming,
    actorIds,
    actors,
    otherCount: Math.max(0, actorIds.length - 1),
    actorName: primary.name,
    actorNickname: primary.nickname,
    actorAvatar: primary.avatar,
  };

  if (coalesceIncrement) {
    merged = applyCoalesceIncrement(merged, coalesceIncrement);
  } else if (incoming.commentCount !== undefined) {
    merged.commentCount = incoming.commentCount;
  }

  if (incoming._pendingEmail) {
    merged._pendingEmail = incoming._pendingEmail;
  }

  return merged;
}

function mergePendingData(
  existing: InternalNotificationData,
  incoming: InternalNotificationData,
  actorId: string | null | undefined,
  type: NotificationType,
  coalesceIncrement?: ScheduleNotificationParams['coalesceIncrement'],
): InternalNotificationData {
  if (actorId && ENTITY_SCOPED_TYPES.has(type)) {
    return mergeActorIntoPendingData(existing, actorId, incoming, coalesceIncrement);
  }

  let merged: InternalNotificationData = { ...existing, ...incoming };

  if (coalesceIncrement) {
    merged = applyCoalesceIncrement(merged, coalesceIncrement);
  }

  if (incoming._pendingEmail) {
    merged._pendingEmail = incoming._pendingEmail;
  }

  return merged;
}

export async function cancelPendingNotification(
  dedupeKeyOrParams: string | ScheduleNotificationParams,
): Promise<void> {
  const dedupeKey = typeof dedupeKeyOrParams === 'string'
    ? dedupeKeyOrParams
    : dedupeKeyOrParams.dedupeKey ?? buildNotificationDedupeKey({
      type: dedupeKeyOrParams.type,
      recipientUserId: dedupeKeyOrParams.userId,
      actorId: dedupeKeyOrParams.actorId,
      entityType: dedupeKeyOrParams.entityType,
      entityId: dedupeKeyOrParams.entityId,
    });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('pending_notifications')
    .delete()
    .eq('dedupe_key', dedupeKey);

  if (error) {
    console.error('Failed to cancel pending notification:', error);
  }
}

export async function removeActorFromPendingNotification(params: {
  type: NotificationType;
  recipientUserId: string;
  actorId: string;
  entityType: NotificationEntityType;
  entityId?: string | null;
}): Promise<void> {
  if (!ENTITY_SCOPED_TYPES.has(params.type)) {
    await cancelPendingNotification(buildNotificationDedupeKey(params));
    return;
  }

  const dedupeKey = buildNotificationDedupeKey(params);
  const supabase = createAdminClient();

  const { data: pending, error: fetchError } = await supabase
    .from('pending_notifications')
    .select('notification_data')
    .eq('dedupe_key', dedupeKey)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to fetch pending notification for actor removal:', fetchError);
    return;
  }

  if (!pending) {
    return;
  }

  const data = (pending.notification_data || {}) as InternalNotificationData;
  const actors = (data.actors ?? []).filter((actor) => actor.id !== params.actorId);

  if (actors.length === 0) {
    await cancelPendingNotification(dedupeKey);
    return;
  }

  const primary = actors[actors.length - 1]!;
  const actorIds = actors.map((actor) => actor.id);

  const { error: updateError } = await supabase
    .from('pending_notifications')
    .update({
      actor_id: primary.id,
      notification_data: {
        ...data,
        actors,
        actorIds,
        otherCount: Math.max(0, actorIds.length - 1),
        actorName: primary.name,
        actorNickname: primary.nickname,
        actorAvatar: primary.avatar,
      } as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('dedupe_key', dedupeKey);

  if (updateError) {
    console.error('Failed to update pending notification after actor removal:', updateError);
  }
}

async function verifyFollowStillExists(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  return !!data;
}

async function verifyLikeStillExists(
  type: 'like_photo' | 'like_album',
  actorId: string,
  entityId: string,
): Promise<boolean> {
  const supabase = createAdminClient();

  if (type === 'like_photo') {
    const { data } = await supabase
      .from('photo_likes')
      .select('photo_id')
      .eq('photo_id', entityId)
      .eq('user_id', actorId)
      .maybeSingle();
    return !!data;
  }

  const { data } = await supabase
    .from('album_likes')
    .select('album_id')
    .eq('album_id', entityId)
    .eq('user_id', actorId)
    .maybeSingle();
  return !!data;
}

async function filterValidActors(
  type: NotificationType,
  entityId: string | null | undefined,
  data: InternalNotificationData,
): Promise<InternalNotificationData | null> {
  if (!entityId) {
    return data;
  }

  if (type === 'like_photo' || type === 'like_album') {
    const actors = data.actors ?? [];
    const validActors: ActorEntry[] = [];

    for (const actor of actors) {
      const stillLiked = await verifyLikeStillExists(type, actor.id, entityId);
      if (stillLiked) {
        validActors.push(actor);
      }
    }

    if (validActors.length === 0) {
      return null;
    }

    const primary = validActors[validActors.length - 1]!;
    const actorIds = validActors.map((actor) => actor.id);

    return {
      ...data,
      actors: validActors,
      actorIds,
      otherCount: Math.max(0, actorIds.length - 1),
      actorName: primary.name,
      actorNickname: primary.nickname,
      actorAvatar: primary.avatar,
    };
  }

  return data;
}

async function verifyActionStillValid(
  params: ScheduleNotificationParams,
): Promise<boolean> {
  if (!params.validateAction || !params.actorId) {
    return true;
  }

  if (params.validateAction === 'follow') {
    return verifyFollowStillExists(params.actorId, params.userId);
  }

  if (!params.entityId) {
    return false;
  }

  return verifyLikeStillExists(params.validateAction, params.actorId, params.entityId);
}

async function hasUndismissedDuplicate(
  params: ScheduleNotificationParams,
): Promise<boolean> {
  if (!UNDISMISSED_DEDUPE_TYPES.has(params.type)) {
    return false;
  }

  if (ENTITY_SCOPED_TYPES.has(params.type)) {
    return false;
  }

  const supabase = createAdminClient();
  let query = supabase
    .from('notifications')
    .select('id')
    .eq('user_id', params.userId)
    .eq('type', params.type)
    .is('dismissed_at', null)
    .limit(1);

  if (params.actorId) {
    query = query.eq('actor_id', params.actorId);
  }
  if (params.entityType) {
    query = query.eq('entity_type', params.entityType);
  }
  if (params.entityId) {
    query = query.eq('entity_id', params.entityId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('Failed to check duplicate notification:', error);
    return false;
  }

  return !!data;
}

async function findUnseenNotificationOnEntity(
  userId: string,
  type: NotificationType,
  entityType: NotificationEntityType,
  entityId: string,
) {
  const supabase = createAdminClient();
  return supabase
    .from('notifications')
    .select('id, data')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('seen_at', null)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

function mergeDeliveredEntityNotification(
  existingData: NotificationData,
  incomingData: NotificationData,
): NotificationData {
  const existingActors = (existingData.actors as ActorEntry[] | undefined) ?? [];
  const incomingActors = (incomingData.actors as ActorEntry[] | undefined) ?? [];
  const actorMap = new Map<string, ActorEntry>();

  for (const actor of existingActors) {
    actorMap.set(actor.id, actor);
  }
  for (const actor of incomingActors) {
    actorMap.set(actor.id, actor);
  }

  const actors = Array.from(actorMap.values());
  const incomingActorIds = Array.isArray(incomingData.actorIds)
    ? incomingData.actorIds as string[]
    : [];
  const primary = actors[actors.length - 1] ?? {
    id: incomingActorIds[incomingActorIds.length - 1] ?? '',
    name: incomingData.actorName,
    nickname: incomingData.actorNickname,
    avatar: incomingData.actorAvatar,
  };

  const existingCommentCount = typeof existingData.commentCount === 'number' ? existingData.commentCount : 0;
  const incomingCommentCount = typeof incomingData.commentCount === 'number' ? incomingData.commentCount : 0;
  const commentCount = existingCommentCount + incomingCommentCount;

  return {
    ...existingData,
    ...incomingData,
    actors,
    actorIds: actors.map((actor) => actor.id),
    otherCount: Math.max(0, actors.length - 1),
    actorName: primary.name ?? incomingData.actorName,
    actorNickname: primary.nickname ?? incomingData.actorNickname,
    actorAvatar: primary.avatar ?? incomingData.actorAvatar,
    commentCount: commentCount > 0 ? commentCount : incomingData.commentCount,
  };
}

async function deliverFollowedUploadWithCoalesce(
  params: ScheduleNotificationParams,
  displayData: NotificationData,
): Promise<string | undefined> {
  const supabase = createAdminClient();
  const coalesceSince = new Date(Date.now() - FOLLOWED_UPLOAD_COALESCE_MS).toISOString();

  const { data: existing } = await supabase
    .from('notifications')
    .select('id, data')
    .eq('user_id', params.userId)
    .eq('actor_id', params.actorId!)
    .eq('type', 'followed_upload')
    .eq('entity_type', params.entityType)
    .eq('entity_id', params.entityId!)
    .is('seen_at', null)
    .is('dismissed_at', null)
    .gte('created_at', coalesceSince)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const existingData = (existing.data || {}) as NotificationData;
    const incomingCount = typeof displayData.photoCount === 'number' ? displayData.photoCount : 1;
    const previousCount = typeof existingData.photoCount === 'number' ? existingData.photoCount : 0;

    await supabase
      .from('notifications')
      .update({
        data: {
          ...existingData,
          ...displayData,
          photoCount: previousCount + incomingCount,
        } as Json,
      })
      .eq('id', existing.id);

    revalidateTag(`notifications-${params.userId}`, 'max');
    return existing.id;
  }

  const result = await createNotification({ ...params, data: displayData });
  return result.notificationId;
}

async function deliverEntityScopedNotification(
  params: ScheduleNotificationParams,
  displayData: NotificationData,
): Promise<string | undefined> {
  if (!params.entityId) {
    const result = await createNotification({ ...params, data: displayData });
    return result.notificationId;
  }

  const { data: existing } = await findUnseenNotificationOnEntity(
    params.userId,
    params.type,
    params.entityType,
    params.entityId,
  );

  if (existing) {
    const supabase = createAdminClient();
    const mergedData = mergeDeliveredEntityNotification(
      (existing.data || {}) as NotificationData,
      displayData,
    );

    await supabase
      .from('notifications')
      .update({ data: mergedData as Json })
      .eq('id', existing.id);

    revalidateTag(`notifications-${params.userId}`, 'max');
    return existing.id;
  }

  const result = await createNotification({ ...params, data: displayData });
  return result.notificationId;
}

async function queuePendingEmail(
  userId: string,
  entityId: string | null | undefined,
  notificationId: string | undefined,
  pendingEmail: PendingEmailPayload | undefined,
): Promise<void> {
  if (!pendingEmail || !notificationId || !entityId) {
    return;
  }

  await enqueueCommentNotificationEmail({
    recipientUserId: userId,
    entityId,
    notificationId,
    item: pendingEmail,
    batchEntityType: pendingEmail.batchEntityType,
  });
}

export async function deliverPendingNotification(dedupeKey: string): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: claimed, error: claimError } = await supabase
    .from('pending_notifications')
    .delete()
    .eq('dedupe_key', dedupeKey)
    .lte('deliver_at', now)
    .select('*')
    .maybeSingle();

  if (claimError) {
    console.error('Failed to claim pending notification:', claimError);
    return;
  }

  if (!claimed) {
    return;
  }

  const rawData = (claimed.notification_data || {}) as InternalNotificationData;
  const pendingEmail = rawData._pendingEmail;

  const params: ScheduleNotificationParams = {
    userId: claimed.recipient_user_id,
    actorId: claimed.actor_id,
    type: claimed.type as NotificationType,
    entityType: claimed.entity_type as NotificationEntityType,
    entityId: claimed.entity_id,
    validateAction: claimed.type === 'follow'
      ? 'follow'
      : claimed.type === 'like_photo'
        ? 'like_photo'
        : claimed.type === 'like_album'
          ? 'like_album'
          : undefined,
  };

  let validatedData = await filterValidActors(
    params.type,
    params.entityId,
    rawData,
  );

  if (!validatedData) {
    return;
  }

  if (!ENTITY_SCOPED_TYPES.has(params.type) && !(await verifyActionStillValid(params))) {
    return;
  }

  if (await hasUndismissedDuplicate(params)) {
    return;
  }

  const displayData = stripInternalFields(validatedData);
  let notificationId: string | undefined;

  if (params.type === 'followed_upload') {
    notificationId = await deliverFollowedUploadWithCoalesce(params, displayData);
  } else if (ENTITY_SCOPED_TYPES.has(params.type)) {
    notificationId = await deliverEntityScopedNotification(params, displayData);
  } else {
    const result = await createNotification({ ...params, data: displayData });
    if (!result.success) {
      console.error('Failed to deliver notification:', result.error);
      return;
    }
    notificationId = result.notificationId;
  }

  await queuePendingEmail(params.userId, params.entityId, notificationId, pendingEmail);
}

export async function flushPendingNotifications(): Promise<FlushPendingNotificationsResult> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: dueRows, error } = await supabase
    .from('pending_notifications')
    .select('dedupe_key')
    .lte('deliver_at', now)
    .order('deliver_at', { ascending: true })
    .limit(FLUSH_BATCH_LIMIT);

  if (error) {
    console.error('Failed to fetch due pending notifications:', error);
    return { delivered: 0, failed: 0, processed: 0 };
  }

  if (!dueRows?.length) {
    return { delivered: 0, failed: 0, processed: 0 };
  }

  let delivered = 0;
  let failed = 0;

  for (const row of dueRows) {
    try {
      await deliverPendingNotification(row.dedupe_key);
      delivered += 1;
    } catch (deliverError) {
      console.error(`Failed to deliver pending notification ${row.dedupe_key}:`, deliverError);
      failed += 1;
    }
  }

  return {
    delivered,
    failed,
    processed: dueRows.length,
  };
}

export async function scheduleNotification(
  params: ScheduleNotificationParams,
): Promise<void> {
  const supabase = createAdminClient();
  const dedupeKey = params.dedupeKey ?? buildNotificationDedupeKey({
    type: params.type,
    recipientUserId: params.userId,
    actorId: params.actorId,
    entityType: params.entityType,
    entityId: params.entityId,
  });

  const deliverAt = new Date(Date.now() + NOTIFICATION_DELAY_MS).toISOString();

  const incomingData: InternalNotificationData = {
    ...(params.data ?? {}),
  };

  if (params.pendingEmail) {
    incomingData._pendingEmail = params.pendingEmail;
  }

  if (params.actorId && ENTITY_SCOPED_TYPES.has(params.type)) {
    incomingData.actors = [buildActorEntry(params.actorId, incomingData)];
    incomingData.actorIds = [params.actorId];
    incomingData.otherCount = 0;
  }

  if (params.coalesceIncrement && !ENTITY_SCOPED_TYPES.has(params.type)) {
    const { field, by = 1 } = params.coalesceIncrement;
    incomingData[field] = by;
  } else if (params.coalesceIncrement && ENTITY_SCOPED_TYPES.has(params.type)) {
    const { field, by = 1 } = params.coalesceIncrement;
    incomingData[field] = by;
  }

  const { data: existing } = await supabase
    .from('pending_notifications')
    .select('notification_data')
    .eq('dedupe_key', dedupeKey)
    .maybeSingle();

  let notificationData = incomingData;
  if (existing?.notification_data) {
    notificationData = mergePendingData(
      existing.notification_data as InternalNotificationData,
      incomingData,
      params.actorId,
      params.type,
      params.coalesceIncrement,
    );
  }

  const primaryActorId = params.actorId
    ?? (notificationData.actorIds?.[notificationData.actorIds.length - 1] ?? null);

  const { error } = await supabase
    .from('pending_notifications')
    .upsert({
      dedupe_key: dedupeKey,
      recipient_user_id: params.userId,
      actor_id: primaryActorId,
      type: params.type,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      deliver_at: deliverAt,
      notification_data: notificationData as Json,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to schedule notification:', error);
    return;
  }

  after(async () => {
    try {
      await sleep(NOTIFICATION_DELAY_MS);
      await deliverPendingNotification(dedupeKey);
    } catch (deliverError) {
      console.error('Background notification delivery failed:', deliverError);
    }
  });
}

export function schedulePendingNotificationFlush(): void {
  after(async () => {
    try {
      await flushPendingNotifications();
    } catch (error) {
      console.error('Background pending notification flush failed:', error);
    }
  });
}
