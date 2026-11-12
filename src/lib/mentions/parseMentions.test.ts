import { describe, expect, it } from 'vitest';

import { parseMentionNicknames, planMentionChanges } from './parseMentions';

describe('parseMentionNicknames', () => {
  it('reads nicknames and ignores emails, urls, and short tokens', () => {
    const text = 'Hi @kal-el, see https://site/@hidden and email@john.com plus @ab and @murtada.';
    expect(parseMentionNicknames(text)).toEqual(['kal-el', 'murtada']);
  });

  it('dedupes and lowercases', () => {
    expect(parseMentionNicknames('@Murtada and @murtada')).toEqual(['murtada']);
  });

  it('allows a mention after an opening parenthesis', () => {
    expect(parseMentionNicknames('(@john-doe)')).toEqual(['john-doe']);
  });
});

describe('planMentionChanges', () => {
  const actor = 'actor';
  const other = 'other';
  const optedOut = 'opted-out';

  it('inserts new mentions and notifies them', () => {
    const plan = planMentionChanges({
      existingUserIds: [],
      actorId: actor,
      matches: [
        { userId: other, allowMemberTags: true },
        { userId: actor, allowMemberTags: true },
      ],
    });

    expect(plan.insertUserIds.sort()).toEqual([actor, other].sort());
    expect(plan.deleteUserIds).toEqual([]);
    expect(plan.notifyUserIds).toEqual([other]);
  });

  it('does not notify people who are already mentioned', () => {
    const plan = planMentionChanges({
      existingUserIds: [other],
      actorId: actor,
      matches: [{ userId: other, allowMemberTags: true }],
    });

    expect(plan.insertUserIds).toEqual([]);
    expect(plan.notifyUserIds).toEqual([]);
  });

  it('removes mentions that left the text', () => {
    const plan = planMentionChanges({
      existingUserIds: [other],
      actorId: actor,
      matches: [],
    });

    expect(plan.deleteUserIds).toEqual([other]);
    expect(plan.notifyUserIds).toEqual([]);
  });

  it('skips opted-out members except a self-mention', () => {
    const plan = planMentionChanges({
      existingUserIds: [],
      actorId: actor,
      matches: [
        { userId: optedOut, allowMemberTags: false },
        { userId: actor, allowMemberTags: false },
      ],
    });

    expect(plan.insertUserIds).toEqual([actor]);
    expect(plan.notifyUserIds).toEqual([]);
  });

  it('does not notify someone already receiving the comment notification', () => {
    const plan = planMentionChanges({
      existingUserIds: [],
      actorId: actor,
      skipNotifyUserIds: [other],
      matches: [{ userId: other, allowMemberTags: true }],
    });

    expect(plan.insertUserIds).toEqual([other]);
    expect(plan.notifyUserIds).toEqual([]);
  });
});
