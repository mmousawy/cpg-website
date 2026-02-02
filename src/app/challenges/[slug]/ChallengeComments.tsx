'use client';

import Comments from '@/components/shared/Comments';

interface ChallengeCommentsProps {
  challengeId: string;
}

export default function ChallengeComments({ challengeId }: ChallengeCommentsProps) {
  return <Comments
    challengeId={challengeId}
  />;
}
