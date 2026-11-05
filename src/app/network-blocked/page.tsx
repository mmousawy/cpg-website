import Link from 'next/link';

import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';
import { routes } from '@/config/routes';

export default function NetworkBlockedPage() {
  return (
    <PageContainer>
      <PageHeading
        title="Access not available"
      />
      <div
        className="prose prose-neutral dark:prose-invert max-w-xl"
      >
        <p>
          This network cannot use Creative Photography Group right now. That usually follows a
          suspended account that was used from the same connection.
        </p>
        <p>
          If you believe this is a mistake, contact us through the help page and we can review it.
        </p>
        <ul>
          <li>
            <Link
              href={routes.help.url}
            >{routes.help.label}</Link>
          </li>
          <li>
            <Link
              href={routes.contact.url}
            >{routes.contact.label}</Link>
          </li>
        </ul>
      </div>
    </PageContainer>
  );
}
