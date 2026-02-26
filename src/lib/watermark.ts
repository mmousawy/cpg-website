import sharp from 'sharp';

export type WatermarkStyle = 'text' | 'diagonal';

function createSvgWatermark(
  text: string,
  style: WatermarkStyle,
  imageWidth: number,
  imageHeight: number,
): string {
  const baseFontSize = Math.min(imageWidth, imageHeight) * 0.03;
  const padding = baseFontSize * 2;

  const isDiagonal = style === 'diagonal';
  const fontSize = isDiagonal ? baseFontSize * 1.25 : baseFontSize;
  const opacity = isDiagonal ? 0.10 : 0.20;
  const fontWeight = isDiagonal ? '600' : 'normal';
  const transform = isDiagonal
    ? `rotate(-45 ${imageWidth / 2} ${imageHeight / 2})`
    : '';
  const x = isDiagonal ? imageWidth / 2 : imageWidth - padding;
  const y = isDiagonal ? imageHeight / 2 : imageHeight - padding;
  const textAnchor = isDiagonal ? 'middle' : 'end';
  const dominantBaseline = isDiagonal ? 'middle' : 'auto';

  const blurRadius = Math.max(1, fontSize * 0.08);

  return `
<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="${blurRadius}" stdDeviation="${blurRadius}" flood-color="black" flood-opacity="0.5"/>
    </filter>
  </defs>
  <g transform="${transform}" opacity="${opacity}">
    <text
      x="${x}"
      y="${y}"
      text-anchor="${textAnchor}"
      dominant-baseline="${dominantBaseline}"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="${fontSize}px"
      font-weight="${fontWeight}"
      fill="white"
      filter="url(#shadow)"
    >${escapeXml(text)}</text>
  </g>
</svg>
  `.trim();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Apply a text watermark to an image buffer, preserving color space,
 * ICC profile, EXIF/IPTC metadata, and re-encoding at high quality.
 */
export async function applyWatermark(
  inputBuffer: Buffer,
  text: string,
  style: WatermarkStyle = 'text',
): Promise<Buffer> {
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width ?? 1920;
  const height = metadata.height ?? 1080;
  const format = metadata.format ?? 'jpeg';

  const svg = createSvgWatermark(text, style, width, height);
  const svgBuffer = Buffer.from(svg);

  let pipeline = sharp(inputBuffer)
    .keepMetadata()
    .composite([{ input: svgBuffer, top: 0, left: 0 }]);

  if (format === 'jpeg' || format === 'jpg') {
    pipeline = pipeline.jpeg({ quality: 95, chromaSubsampling: '4:4:4' });
  } else if (format === 'png') {
    pipeline = pipeline.png();
  } else if (format === 'webp') {
    pipeline = pipeline.webp({ quality: 95 });
  } else if (format === 'avif') {
    pipeline = pipeline.avif({ quality: 90 });
  }

  return pipeline.toBuffer();
}
