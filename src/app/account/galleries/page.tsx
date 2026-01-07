import { redirect } from 'next/navigation';

// Redirect old galleries page to new unified photos page
export default function AccountGalleriesPage() {
  redirect('/account/photos');
}
