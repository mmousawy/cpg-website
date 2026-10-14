/**
 * Case- and punctuation-insensitive key for deduping gear names across EXIF, imports, and user input.
 */
export function gearAliasKey(input: string): string {
  const normalized = input.normalize('NFKC').toLowerCase();
  return normalized.replace(/[\s\-_/.,'"()+®™]+/g, '');
}
