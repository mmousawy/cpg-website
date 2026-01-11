'use server';

import { revalidatePath } from 'next/cache';

/**
 * Revalidate paths when data changes.
 * Call this from client components after mutations.
 */

// Revalidate album-related pages
export async function revalidateAlbum(nickname: string, albumSlug?: string) {
  // Revalidate the public album page
  if (albumSlug) {
    revalidatePath(`/@${nickname}/album/${albumSlug}`);
  }
  // Revalidate the user's profile page (shows their albums)
  revalidatePath(`/@${nickname}`);
  // Revalidate the galleries listing page
  revalidatePath('/galleries');
  // Revalidate homepage (shows recent albums)
  revalidatePath('/');
}

// Revalidate profile-related pages
export async function revalidateProfile(nickname: string) {
  revalidatePath(`/@${nickname}`);
  // Revalidate homepage (shows members)
  revalidatePath('/');
}

// Revalidate event-related pages
export async function revalidateEvent(eventSlug?: string) {
  // Revalidate specific event page
  if (eventSlug) {
    revalidatePath(`/events/${eventSlug}`);
  }
  // Revalidate events listing page
  revalidatePath('/events');
  // Revalidate homepage (shows recent events)
  revalidatePath('/');
}

// Revalidate all public pages (use sparingly)
export async function revalidateAll() {
  revalidatePath('/', 'layout');
}
