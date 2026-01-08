import { redirect } from 'next/navigation';

// This page has been consolidated into /account/photos
// Redirect old URLs to the new unified page
export default function AlbumDetailPage() {
  redirect('/account/photos');
}
