import { gearAliasKey } from '@/lib/gear/gearAliasKey';
import type { CatalogUpsertInput } from '@/lib/gear/catalogDb';
import type { GearCategory } from '@/lib/gear/types';

function pickLangTag(block: string, tag: string): { default: string; en?: string } {
  const re = new RegExp(`<${tag}(?:\\s+lang="([^"]+)")?>([^<]*)</${tag}>`, 'g');
  let defaultVal = '';
  let enVal: string | undefined;
  let match: RegExpExecArray | null;
  while ((match = re.exec(block)) !== null) {
    const lang = match[1];
    const value = match[2].trim();
    if (!value) continue;
    if (lang === 'en') {
      enVal = value;
    } else if (!lang) {
      defaultVal = value;
    }
  }
  return { default: defaultVal, en: enVal };
}

function displayName(brand: string, modelDefault: string, modelEn?: string): string {
  const model = modelEn || modelDefault;
  if (!model) return brand;
  const lowerModel = model.toLowerCase();
  const lowerBrand = brand.toLowerCase();
  if (lowerModel.includes(lowerBrand)) {
    return model;
  }
  return `${brand} ${model}`.trim();
}

function parseBlocks(xml: string, tag: 'camera' | 'lens'): string[] {
  const blocks: string[] = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

export function parseLensfunXml(xml: string, fileName: string): CatalogUpsertInput[] {
  const results: CatalogUpsertInput[] = [];
  const categoryForTag = (tag: 'camera' | 'lens'): GearCategory => (tag === 'camera' ? 'camera_body' : 'lens');

  for (const tag of ['camera', 'lens'] as const) {
    const category = categoryForTag(tag);
    for (const block of parseBlocks(xml, tag)) {
      const maker = pickLangTag(block, 'maker');
      const model = pickLangTag(block, 'model');
      const brand = maker.en || maker.default;
      const exifModel = model.default;
      const name = displayName(brand, model.default, model.en);
      if (!name.trim()) continue;

      const sourceKey = `${fileName}:${tag}:${gearAliasKey(exifModel || name)}`;
      const aliasStrings = [name, exifModel, model.en, `${brand} ${exifModel}`].filter(Boolean) as string[];

      results.push({
        source: 'lensfun',
        sourceKey,
        category,
        brand,
        name,
        aliasStrings,
      });
    }
  }

  return results;
}
