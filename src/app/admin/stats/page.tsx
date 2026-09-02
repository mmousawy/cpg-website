import AdminStatsClient from '@/app/admin/stats/AdminStatsClient';
import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Statistics',
  description: 'Admin statistics and analytics dashboard',
});

export const instant = false;

export default function AdminStatsPage() {
  return <AdminStatsClient />;
}
