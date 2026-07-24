/**
 * Fire-and-forget client helper after public photos are published.
 */
export async function notifyFollowersOfUpload(photoIds: string[]): Promise<void> {
  if (photoIds.length === 0) {
    return;
  }

  try {
    await fetch('/api/follows/notify-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoIds }),
    });
  } catch {
    // Non-blocking: follower notifications should not fail uploads
  }
}
