/** Fire-and-forget EXIF gear harvest after a photo is saved */
export function triggerGearIngest(photoId: string) {
  if (!photoId) return;
  fetch('/api/gear/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoId }),
    keepalive: true,
  }).catch(() => {
    // Non-critical
  });
}
