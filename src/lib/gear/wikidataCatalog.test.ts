import { describe, expect, it } from 'vitest';
import {
  formatWikidataGearName,
  isAcceptableWikidataGearLabel,
} from './wikidataCatalog';

describe('wikidataCatalog', () => {
  it('rejects non-product labels', () => {
    expect(isAcceptableWikidataGearLabel('scientific article published in 2014')).toBe(false);
    expect(isAcceptableWikidataGearLabel('Sony Cyber-shot DSC-W30')).toBe(true);
  });

  it('formats brand + model without duplication', () => {
    expect(formatWikidataGearName('Sony Group', 'Sony Cyber-shot DSC-W30')).toBe('Sony Cyber-shot DSC-W30');
    expect(formatWikidataGearName('Canon', 'EOS R5')).toBe('Canon EOS R5');
  });
});
