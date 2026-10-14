import { describe, expect, it } from 'vitest';
import {
  buildWikidataSparql,
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

  it('uses direct P31 and optional keyset filter in SPARQL', () => {
    const base = buildWikidataSparql('Q20888659', 500, true);
    expect(base).toContain('?item wdt:P31 wd:Q20888659');
    expect(base).not.toContain('P279');

    const paged = buildWikidataSparql('Q20888659', 100, true, 'http://www.wikidata.org/entity/Q2308014');
    expect(paged).toContain('FILTER(STR(?item) > "http://www.wikidata.org/entity/Q2308014")');
  });
});
