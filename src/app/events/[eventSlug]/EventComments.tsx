'use client';

import Comments from '@/components/shared/Comments';

interface EventCommentsProps {
  eventId: string;
}

export default function EventComments({ eventId }: EventCommentsProps) {
  return <Comments eventId={eventId} />;
}
