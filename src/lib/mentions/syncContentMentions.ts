import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { scheduleNotification } from '@/lib/notifications/schedule';
import type { NotificationEntityType, NotificationType } from '@/types/notifications';
import { createAdminClient } from '@/utils/supabase/admin';

import { parseMentionNicknames, planMentionChanges } from './parseMentions';

type AdminClient = SupabaseClient<Database>;

export type SyncContentMentionsParams = {
  sourceType: 'comment' | 'photo' | 'album';
  sourceId: string;
  text: string;
  actorId: string;
  notificationType: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  entityTitle: string;
  entityLink: string;
  entityThumbnail?: string | null;
  contextLabel: string;
  skipNotifyUserIds?: string[];
};

export async function syncContentMentions(
  params: SyncContentMentionsParams,
  supabase: AdminClient = createAdminClient(),
): Promise<void> {
  const nicknames = parseMentionNicknames(params.text);

  const [{ data: existingRows, error: existingError }, { data: profiles, error: profileError }, { data: actor }] = await Promise.all([
    supabase
      .from('content_mentions')
      .select('mentioned_user_id')
      .eq('source_type', params.sourceType)
      .eq('source_id', params.sourceId),
    nicknames.length > 0
      ? supabase
        .from('profiles')
        .select('id, nickname, allow_member_tags, suspended_at')
        .in('nickname', nicknames)
        .is('suspended_at', null)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('profiles')
      .select('full_name, nickname, avatar_url')
      .eq('id', params.actorId)
      .maybeSingle(),
  ]);

  if (existingError) {
    console.error('Failed to load content mentions:', existingError);
    return;
  }
  if (profileError) {
    console.error('Failed to resolve mention nicknames:', profileError);
    return;
  }

  const plan = planMentionChanges({
    existingUserIds: (existingRows ?? []).map((row) => row.mentioned_user_id),
    matches: (profiles ?? []).flatMap((profile) => (
      profile.nickname
        ? [{ userId: profile.id, allowMemberTags: profile.allow_member_tags }]
        : []
    )),
    actorId: params.actorId,
    skipNotifyUserIds: params.skipNotifyUserIds,
  });

  if (plan.deleteUserIds.length > 0) {
    const { error } = await supabase
      .from('content_mentions')
      .delete()
      .eq('source_type', params.sourceType)
      .eq('source_id', params.sourceId)
      .in('mentioned_user_id', plan.deleteUserIds);
    if (error) {
      console.error('Failed to delete content mentions:', error);
    }
  }

  if (plan.insertUserIds.length > 0) {
    const { error } = await supabase.from('content_mentions').insert(
      plan.insertUserIds.map((mentionedUserId) => ({
        source_type: params.sourceType,
        source_id: params.sourceId,
        mentioned_user_id: mentionedUserId,
      })),
    );
    if (error) {
      console.error('Failed to insert content mentions:', error);
      return;
    }
  }

  const actorName = actor?.full_name || actor?.nickname || 'Someone';
  const actorNickname = actor?.nickname ?? null;

  await Promise.all(plan.notifyUserIds.map((userId) => scheduleNotification({
    userId,
    actorId: params.actorId,
    type: params.notificationType,
    entityType: params.entityType,
    entityId: params.entityId,
    data: {
      title: params.entityTitle,
      thumbnail: params.entityThumbnail ?? null,
      link: params.entityLink,
      actorName,
      actorNickname,
      actorAvatar: actor?.avatar_url ?? null,
    },
    pendingEmail: {
      kind: 'mention',
      actorName,
      actorNickname,
      actorAvatarUrl: actor?.avatar_url ?? null,
      actorProfileLink: actorNickname ? `/@${actorNickname}` : null,
      entityTitle: params.entityTitle,
      entityLink: params.entityLink,
      contextLabel: params.contextLabel,
    },
  })));
}
