import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decompress } from 'wawoff2';

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: 'normal';
};

/** Matches tailwind `font-heading` / `--font-cheria-heading` */
export const CHERIA_HEADING_FONT_NAME = 'Cheria';

let fontsPromise: Promise<OgFont[]> | null = null;

async function loadCheriaHeadingFont(): Promise<OgFont> {
  const woff2 = await readFile(join(process.cwd(), 'public/cheria-bold.woff2'));
  const ttf = await decompress(woff2);
  const fontData = Uint8Array.from(ttf);

  return {
    name: CHERIA_HEADING_FONT_NAME,
    data: fontData.buffer,
    weight: 700,
    style: 'normal',
  };
}

async function loadGoogleFont(
  family: string,
  weight: 400 | 700,
  name: string,
): Promise<OgFont> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`,
    {
      headers: {
        // Request legacy font formats (woff/ttf) — Satori does not support woff2 here.
        'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
      },
    },
  ).then((response) => response.text());

  const fontUrl = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:woff|truetype|opentype)'\)/)?.[1];
  if (!fontUrl) {
    throw new Error(`Failed to resolve ${family} ${weight} font URL`);
  }

  const data = await fetch(fontUrl).then((response) => response.arrayBuffer());

  return {
    name,
    data,
    weight,
    style: 'normal',
  };
}

export async function loadOgFonts(): Promise<OgFont[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      loadCheriaHeadingFont(),
      loadGoogleFont('Geist', 400, 'Geist'),
    ]);
  }

  return fontsPromise;
}
