'use client';

import { useAuth } from '@/hooks/useAuth';
import StackedAvatarsPopover, { type AvatarPerson } from '@/components/shared/StackedAvatarsPopover';

interface SceneCardInterestRowProps {
  people: AvatarPerson[];
  interestCount: number;
}

export default function SceneCardInterestRow({
  people,
  interestCount,
}: SceneCardInterestRowProps) {
  const { user } = useAuth();

  return (
    <StackedAvatarsPopover
      people={people}
      singularLabel="interested"
      pluralLabel="interested"
      emptyMessage="No one interested yet"
      popoverTitle={(c) =>
        `${c} ${c === 1 ? 'person is' : 'people are'} interested`
      }
      showInlineCount
      showCountOnMobile
      avatarSize="xxs"
      disablePopover={!user}
    />
  );
}
