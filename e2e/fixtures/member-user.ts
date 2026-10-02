import { test as base, expect, request as playwrightRequest } from '@playwright/test';

import {
  cleanupTestUsers,
  createTestUser,
  getPlaywrightApiContextOptions,
  type TestUser,
} from '../test-utils';
/**
 * One fully onboarded member per Playwright worker (CI uses a single worker).
 * Shared across specs that need a logged-in account without completing onboarding.
 */
export const test = base.extend<object, { memberUser: TestUser }>({
  memberUser: [
    async ({}, useFixture) => {
      const apiRequest = await playwrightRequest.newContext(getPlaywrightApiContextOptions());
      const user = await createTestUser(apiRequest);
      try {
        await useFixture(user);
      } finally {
        await cleanupTestUsers(apiRequest, [user.email]);
        await apiRequest.dispose();
      }
    },
    { scope: 'worker' },
  ],
});

export { expect };

