import AccountStatsClient from '@/app/account/stats/AccountStatsClient';
import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'My stats',
  description: 'Your photography stats and engagement on Creative Photography Group',
});

export const instant = false;

export default function AccountStatsPage() {
  return <AccountStatsClient />;
}
