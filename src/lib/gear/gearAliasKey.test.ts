import { describe, expect, it } from 'vitest';
import { gearAliasKey } from './gearAliasKey';

describe('gearAliasKey', () => {
  it('folds case and punctuation', () => {
    expect(gearAliasKey('Canon EOS R5')).toBe(gearAliasKey('CANON eos r5'));
    expect(gearAliasKey('Canon EOS-R5')).toBe(gearAliasKey('canon eos r5'));
  });

  it('keeps different apertures distinct', () => {
    expect(gearAliasKey('50mm f/1.8')).not.toBe(gearAliasKey('50mm f/1.4'));
  });
});
