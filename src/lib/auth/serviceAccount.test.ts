import { afterEach, describe, expect, it } from 'vitest';

import { isServiceAccountUserId } from './serviceAccount';

const env = process.env as { SCRAPER_USER_ID?: string };
const ORIGINAL_SCRAPER = env.SCRAPER_USER_ID;

afterEach(() => {
  if (ORIGINAL_SCRAPER === undefined) delete env.SCRAPER_USER_ID;
  else env.SCRAPER_USER_ID = ORIGINAL_SCRAPER;
});

describe('isServiceAccountUserId', () => {
  it('matches SCRAPER_USER_ID when set to a valid uuid', () => {
    const id = '5a11a7c5-9296-4d7d-93ed-965bd493d192';
    env.SCRAPER_USER_ID = id;
    expect(isServiceAccountUserId(id)).toBe(true);
    expect(isServiceAccountUserId('00000000-0000-4000-8000-000000000001')).toBe(false);
  });

  it('returns false when SCRAPER_USER_ID is unset', () => {
    delete env.SCRAPER_USER_ID;
    expect(isServiceAccountUserId('5a11a7c5-9296-4d7d-93ed-965bd493d192')).toBe(false);
  });
});
