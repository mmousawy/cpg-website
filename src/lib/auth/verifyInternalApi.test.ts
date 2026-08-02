import { afterEach, describe, expect, it } from 'vitest';

import { isTestApiEnvironmentAllowed } from './verifyInternalApi';

type EnvBag = {
  NODE_ENV?: string
  CI?: string
  VERCEL_ENV?: string
};

const env = process.env as EnvBag;

const ORIGINAL: EnvBag = {
  NODE_ENV: process.env.NODE_ENV,
  CI: process.env.CI,
  VERCEL_ENV: process.env.VERCEL_ENV,
};

function setEnv({ NODE_ENV, CI, VERCEL_ENV }: EnvBag) {
  if (NODE_ENV === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = NODE_ENV;

  if (CI === undefined) delete env.CI;
  else env.CI = CI;

  if (VERCEL_ENV === undefined) delete env.VERCEL_ENV;
  else env.VERCEL_ENV = VERCEL_ENV;
}

afterEach(() => {
  setEnv(ORIGINAL);
});

describe('isTestApiEnvironmentAllowed', () => {
  it('allows non-production NODE_ENV', () => {
    setEnv({ NODE_ENV: 'development' });
    expect(isTestApiEnvironmentAllowed()).toBe(true);
  });

  it('allows Vercel preview even when NODE_ENV is production', () => {
    setEnv({ NODE_ENV: 'production', VERCEL_ENV: 'preview' });
    expect(isTestApiEnvironmentAllowed()).toBe(true);
  });

  it('blocks Vercel production', () => {
    setEnv({ NODE_ENV: 'production', VERCEL_ENV: 'production' });
    expect(isTestApiEnvironmentAllowed()).toBe(false);
  });

  it('allows CI with production NODE_ENV', () => {
    setEnv({ NODE_ENV: 'production', CI: 'true' });
    expect(isTestApiEnvironmentAllowed()).toBe(true);
  });
});
