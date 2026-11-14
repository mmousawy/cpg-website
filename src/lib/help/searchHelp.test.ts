import { describe, expect, it } from 'vitest';

import { searchHelpItems } from './searchHelp';

describe('searchHelpItems', () => {
  it('matches FAQ titles', () => {
    const results = searchHelpItems('upload photos');
    expect(results.some((r) => r.entity_id === 'upload-photos' && r.entity_type === 'help')).toBe(true);
    expect(results[0]?.url).toBe('/help#upload-photos');
  });

  it('matches body text with lower rank than title hits', () => {
    const byTitle = searchHelpItems('How to create an account');
    const titleHit = byTitle.find((r) => r.entity_id === 'create-account');
    expect(titleHit).toBeDefined();
    expect(titleHit!.rank).toBeGreaterThan(0.8);

    const byBody = searchHelpItems('confirmation link');
    expect(byBody.some((r) => r.entity_id === 'create-account')).toBe(true);
  });

  it('includes license help on the licenses page', () => {
    const results = searchHelpItems('watermark quality');
    const hit = results.find((r) => r.entity_id === 'watermark-quality');
    expect(hit?.url).toBe('/help/licenses#watermark-quality');
  });
});
