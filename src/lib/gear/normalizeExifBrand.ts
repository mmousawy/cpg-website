const MAKE_ALIASES: Record<string, string> = {
  'nikon corporation': 'Nikon',
  nikon: 'Nikon',
  'canon': 'Canon',
  'canon inc.': 'Canon',
  sony: 'Sony',
  'sony corporation': 'Sony',
  fujifilm: 'Fujifilm',
  'fujifilm corporation': 'Fujifilm',
  'ricoh imaging company, ltd.': 'Ricoh',
  ricoh: 'Ricoh',
  apple: 'Apple',
  panasonic: 'Panasonic',
  'panasonic corporation': 'Panasonic',
  olympus: 'Olympus',
  'olympus corporation': 'Olympus',
  'om digital solutions corporation': 'OM System',
  leica: 'Leica',
  'leica camera ag': 'Leica',
  hasselblad: 'Hasselblad',
  pentax: 'Pentax',
  'ricoh imaging company, ltd': 'Ricoh',
};

export function normalizeExifBrand(make: string): string {
  const key = make.trim().toLowerCase();
  return MAKE_ALIASES[key] ?? make.trim();
}
