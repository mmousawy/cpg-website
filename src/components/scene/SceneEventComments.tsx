'use client';

import Comments from '@/components/shared/Comments';

interface SceneEventCommentsProps {
  eventId: string;
}

export default function SceneEventComments({ eventId }: SceneEventCommentsProps) {
  return <Comments
    sceneEventId={eventId}
  />;
}
