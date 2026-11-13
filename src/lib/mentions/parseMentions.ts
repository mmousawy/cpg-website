import { nicknameSchema } from '@/utils/nickname';

const URL_REGEX = /https?:\/\/[^\s<]+/g;
const MENTION_REGEX = /(^|[\s([{"'])@([a-z0-9-]{3,30})(?=$|[\s)\].,!?;:'"”’])/gi;

export function parseMentionNicknames(text: string): string[] {
  const withoutUrls = text.replace(URL_REGEX, (url) => ' '.repeat(url.length));
  const found = new Set<string>();

  for (const match of withoutUrls.matchAll(MENTION_REGEX)) {
    const nickname = match[2].toLowerCase();
    if (nicknameSchema.safeParse(nickname).success) {
      found.add(nickname);
    }
  }

  return [...found];
}

export type MentionMatch = {
  userId: string;
  allowMemberTags: boolean;
};

export function planMentionChanges(input: {
  existingUserIds: string[];
  matches: MentionMatch[];
  actorId: string;
  skipNotifyUserIds?: string[];
}): {
  insertUserIds: string[];
  deleteUserIds: string[];
  notifyUserIds: string[];
} {
  const desired = new Set<string>();
  for (const match of input.matches) {
    if (match.allowMemberTags || match.userId === input.actorId) {
      desired.add(match.userId);
    }
  }

  const existing = new Set(input.existingUserIds);
  const insertUserIds = [...desired].filter((id) => !existing.has(id));
  const deleteUserIds = [...existing].filter((id) => !desired.has(id));
  const skip = new Set(input.skipNotifyUserIds ?? []);
  const notifyUserIds = insertUserIds.filter((id) => id !== input.actorId && !skip.has(id));

  return { insertUserIds, deleteUserIds, notifyUserIds };
}
