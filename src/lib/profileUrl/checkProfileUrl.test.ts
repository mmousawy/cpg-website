import { describe, expect, it } from 'vitest';

import { checkProfileUrl } from '@/lib/profileUrl/checkProfileUrl';
import {
  FIXTURE_CLEAN_HOOOUSE_HTML,
  FIXTURE_GREAT_TIBET_HTML,
  FIXTURE_KARSTEN_HTML,
  FIXTURE_LAW_ESSAY_HTML,
  FIXTURE_MEJA_SEKOLAH_HTML,
  FIXTURE_MURTADA_HTML,
  FIXTURE_SUPER_KSA_HTML,
  classifyFixture,
  expectSocialHost,
} from '@/lib/profileUrl/__fixtures__/pageHtml';

describe('profile URL classification fixtures', () => {
  it('allows murtada.nl portfolio signals', () => {
    const result = classifyFixture(FIXTURE_MURTADA_HTML, 'Murtada al Mousawy');
    expect(result.verdict).toBe('allow');
    expect(result.reason).toBe('portfolio_title');
  });

  it('allows karsten.photo Person schema', () => {
    const result = classifyFixture(FIXTURE_KARSTEN_HTML);
    expect(result.verdict).toBe('allow');
    expect(result.reason).toBe('person_schema');
  });

  it('blocks cleaning company schema', () => {
    const result = classifyFixture(FIXTURE_CLEAN_HOOOUSE_HTML);
    expect(result.verdict).toBe('block');
  });

  it('blocks discount service title', () => {
    const result = classifyFixture(FIXTURE_SUPER_KSA_HTML);
    expect(result.verdict).toBe('block');
    expect(result.reason).toBe('service_title');
  });

  it('blocks furniture catalog', () => {
    const result = classifyFixture(FIXTURE_MEJA_SEKOLAH_HTML);
    expect(result.verdict).toBe('block');
  });

  it('blocks tour agency', () => {
    const result = classifyFixture(FIXTURE_GREAT_TIBET_HTML);
    expect(result.verdict).toBe('block');
    expect(result.reason).toBe('service_title');
  });

  it('blocks essay mill', () => {
    const result = classifyFixture(FIXTURE_LAW_ESSAY_HTML);
    expect(result.verdict).toBe('block');
  });

  it('treats instagram as social host without fetch', async () => {
    expect(expectSocialHost('https://www.instagram.com/example')).toBe(true);
    const result = await checkProfileUrl('https://www.instagram.com/example', {
      skipSafeBrowsing: true,
    });
    expect(result.verdict).toBe('allow');
    expect(result.reason).toBe('social_host');
  });

  it('classifies murtada via html override', async () => {
    const result = await checkProfileUrl('https://murtada.nl/', {
      htmlOverride: FIXTURE_MURTADA_HTML,
      memberFullName: 'Murtada al Mousawy',
      skipSafeBrowsing: true,
    });
    expect(result.verdict).toBe('allow');
  });
});
