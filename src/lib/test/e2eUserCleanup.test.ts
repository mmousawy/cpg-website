import { describe, expect, it } from 'vitest';

import { buildE2eCleanupEmailList } from './e2eUserCleanup';

describe('buildE2eCleanupEmailList', () => {
  it('keeps only test emails and dedupes tracked vs orphan lists', () => {
    const list = buildE2eCleanupEmailList(
      ['test-e2e-1@test.local', 'real@example.com', 'TEST-E2E-1@test.local'],
      ['test-e2e-2@test.local', 'test-e2e-1@test.local'],
    );
    expect(list.sort()).toEqual([
      'test-e2e-1@test.local',
      'test-e2e-2@test.local',
    ]);
  });

  it('allows orphan-only cleanup when no emails were tracked', () => {
    expect(buildE2eCleanupEmailList(undefined, ['user@test.local'])).toEqual(['user@test.local']);
  });
});
