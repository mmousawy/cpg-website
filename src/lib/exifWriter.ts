import piexif from 'piexifjs';

/**
 * Embed copyright and artist metadata into a JPEG buffer.
 * Only writes if the existing EXIF does not already contain copyright.
 */
export function embedCopyrightExif(
  jpegBuffer: Buffer,
  copyrightNotice: string,
  artist: string,
  onlyIfMissing = true,
): Buffer {
  const jpegBinary = jpegBuffer.toString('binary');

  let exifObj: Record<string, Record<number, string> | null>;
  try {
    exifObj = piexif.load(jpegBinary);
  } catch {
    exifObj = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {} as Record<number, string>, thumbnail: null };
  }

  const zeroth = exifObj['0th'] || {};
  const existingCopyright = zeroth[piexif.ImageIFD.Copyright];

  if (onlyIfMissing && existingCopyright) {
    return jpegBuffer;
  }

  zeroth[piexif.ImageIFD.Artist] = artist;
  zeroth[piexif.ImageIFD.Copyright] = copyrightNotice;
  exifObj['0th'] = zeroth;

  const exifBytes = piexif.dump(exifObj);
  const result = piexif.insert(exifBytes, jpegBinary);

  return Buffer.from(result, 'binary');
}
