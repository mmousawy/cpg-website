/** Flickr CDN base (used only by the download script). */
export const FLICKR_SCRAPPY_CAMERA_ICON_CDN =
  'https://combo.staticflickr.com/ap/build/images/scrappy-camera-icons';

/** Local static files under `public/gear/scrappy-camera-icons/`. */
export const SCRAPPY_CAMERA_ICON_PUBLIC_PATH = '/gear/scrappy-camera-icons';

export const SCRAPPY_CAMERA_ICON_GENERIC = 'generic';

/**
 * Ordered list from Flickr's photo-page `cameraMap` (first match wins).
 * @see https://combo.staticflickr.com/ap/build/images/scrappy-camera-icons/
 */
const SCRAPPY_CAMERA_ICON_RULES: ReadonlyArray<{ pattern: RegExp; fileName: string }> = [
  { pattern: /Canon EOS.(1D|R3)/i, fileName: 'CanonEOSMarkII' },
  { pattern: /canon EOS [1-5]0D/i, fileName: 'CanonEOS10D' },
  // Modern Canon EOS (DSLR + R-system). Longer R tokens first; R1 uses (?!\d) so R10/R100 stay distinct.
  {
    pattern: /canon EOS (?:[5-7]D|[6-9]0D|R(?:100|50|10|8|7|6|5)(?!\d)|R1(?!\d)|Ra|RP|R$)/i,
    fileName: 'CanonEOS60D',
  },
  { pattern: /Canon EOS (REBEL T3i|[1-8][05]0D|Kiss X5)/i, fileName: 'CanonEOSRebelXT' },
  { pattern: /Canon PowerShot A510/i, fileName: 'CanonPowerShotA510' },
  { pattern: /Canon PowerShot SD100/i, fileName: 'CanonPowerShotSD100' },
  { pattern: /Canon PowerShot SD750/i, fileName: 'CanonPowerShotSD750' },
  { pattern: /Canon Powershot G9/i, fileName: 'CanonPowershotG9' },
  { pattern: /Canon Powershot N/i, fileName: 'CanonPowershotN' },
  { pattern: /gopro/i, fileName: 'GoProHero3' },
  { pattern: /HTC EVO 4G/i, fileName: 'HTCEVO4G' },
  { pattern: /HTC One/i, fileName: 'HTCOne' },
  { pattern: /htc/i, fileName: 'HTCOne' },
  { pattern: /iphone 5/i, fileName: 'iPhone5' },
  { pattern: /iphone [6-8] plus/i, fileName: 'iPhone6-7-8plus' },
  { pattern: /iphone [6-8]/i, fileName: 'iPhone6-7-8' },
  { pattern: /iphone (x|1[1-9])/i, fileName: 'iPhoneX' },
  { pattern: /iphone/i, fileName: 'iPhone3-4' },
  { pattern: /kodak EasyShare Z740 Zoom/i, fileName: 'KodakEasyShareZ740Zoom' },
  { pattern: /Leica|Zeiss/i, fileName: 'Leica' },
  { pattern: /Lomo/i, fileName: 'Lomo' },
  { pattern: /Lytro/i, fileName: 'Lytro' },
  { pattern: /Motorola X/i, fileName: 'MotorolaX' },
  { pattern: /Nexus 5|LGE Nexus 4/i, fileName: 'Nexus5' },
  { pattern: /Nikon CoolPix/i, fileName: 'NikonCoolPix4600' },
  { pattern: /Nikon DF/i, fileName: 'NikonDF' },
  { pattern: /Nikon Z/i, fileName: 'NikonD100' },
  { pattern: /Nikon D[1-5][a-z]?$/i, fileName: 'NikonD3-4-5' },
  { pattern: /Nikon D/i, fileName: 'NikonD100' },
  { pattern: /Olympus EVOLTE 500/i, fileName: 'OlympusEVOLTE500' },
  { pattern: /Panasonic DMC-FZ18/i, fileName: 'PanasonicDMC-FZ18' },
  { pattern: /Panasonic DMC-GF1/i, fileName: 'PanasonicLumixGF1' },
  { pattern: /Pentax K100D/i, fileName: 'PentaxK100D' },
  { pattern: /Polaroid/i, fileName: 'Polaroid' },
  { pattern: /SamsungGalaxySII$/i, fileName: 'SamsungGalaxySII' },
  { pattern: /SamsungGalaxySIII$/i, fileName: 'SamsungGalaxySII' },
  { pattern: /SM-G93[05]/i, fileName: 'SamsungGalaxyS7' },
  { pattern: /SM-G95[05]/i, fileName: 'SamsungGalaxyS8' },
  { pattern: /SM-G96[05]/i, fileName: 'SamsungGalaxyS9' },
  { pattern: /SM-G97\d/i, fileName: 'SamsungGalaxyS10' },
  { pattern: /Sony A7|ILCE-[1-9]/i, fileName: 'SonyA7' },
  { pattern: /Sony Alpha DSLR-A100/i, fileName: 'SonyAlphaDSLR-A100' },
  { pattern: /Sony CyberShot DSC-W80/i, fileName: 'SonyCyber-ShotDSC-W80' },
  { pattern: /Sony CyberShot DSCF828|Sony DSC-F828/i, fileName: 'SonyCyberShotDSCF828' },
  { pattern: /Sony Ericson K750i/i, fileName: 'SonyEricsonK750i' },
  // Flickr CDN no longer serves SonyEricsonK800i; reuse K750i art.
  { pattern: /Sony Ericson K800i|K800i/i, fileName: 'SonyEricsonK750i' },
  { pattern: /Sony NEX-[56]|ILCE-5[01]00/i, fileName: 'SonyNEX-5' },
  { pattern: /SonyRX|Sony DSC-RX100/i, fileName: 'SonyRX' },
];

/** Every distinct PNG filename in Flickr's closed scrappy set (includes generic). */
export function listScrappyCameraIconFileNames(): string[] {
  const names = new Set<string>(SCRAPPY_CAMERA_ICON_RULES.map((r) => r.fileName));
  names.add(SCRAPPY_CAMERA_ICON_GENERIC);
  return [...names].sort();
}

/** Match against Flickr's closed illustration set only; never returns generic. */
export function matchScrappyCameraIcon(camera: string): string | null {
  const trimmed = camera.trim();
  if (!trimmed) return null;

  for (const rule of SCRAPPY_CAMERA_ICON_RULES) {
    if (rule.pattern.test(trimmed)) {
      return rule.fileName;
    }
  }

  return null;
}

export function scrappyCameraIconFileName(camera: string): string | null {
  const trimmed = camera.trim();
  if (!trimmed) return null;

  return matchScrappyCameraIcon(trimmed) ?? SCRAPPY_CAMERA_ICON_GENERIC;
}

/** `@2x` PNG URL for a camera display string, or `null` when empty. */
export function scrappyCameraIconUrl(camera: string, retina = true): string | null {
  const fileName = scrappyCameraIconFileName(camera);
  if (!fileName) return null;
  return `${SCRAPPY_CAMERA_ICON_PUBLIC_PATH}/${fileName}${retina ? '@2x' : ''}.png`;
}
