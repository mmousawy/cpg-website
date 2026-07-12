import type { Area, MediaSize, Point, Size } from 'react-easy-crop';

export type BoundedCropDrawParams = {
  outputWidth: number;
  outputHeight: number;
  source: Area;
  dest: Point;
};

export const CROPPER_ZOOM_EPSILON = 0.001;

/** Derive rendered media size from natural dimensions and the current crop width */
export function getEffectiveMediaSize(media: MediaSize, cropWidth: number): MediaSize {
  const naturalAspect = media.naturalWidth / media.naturalHeight;

  return {
    ...media,
    width: cropWidth,
    height: cropWidth / naturalAspect,
  };
}

export function getWidthFitZoom(mediaSize: MediaSize, cropSize: Size): number {
  return cropSize.width / mediaSize.width;
}

export function getHeightFitZoom(mediaSize: MediaSize, cropSize: Size): number {
  return cropSize.height / mediaSize.height;
}

/** Minimum zoom so the image fully covers the crop area */
export function getCoverFitZoom(mediaSize: MediaSize, cropSize: Size): number {
  return Math.max(
    getWidthFitZoom(mediaSize, cropSize),
    getHeightFitZoom(mediaSize, cropSize),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function limitArea(max: number, value: number): number {
  return clamp(value, 0, max);
}

/**
 * Pixel crop aligned with clampCropPosition's horizontal-cover layout.
 * Uses effective media dimensions so output matches the expanded pan range.
 */
export function computeClampedCroppedAreaPixels(
  crop: Point,
  media: MediaSize,
  cropSize: Size,
  cropWidth: number,
  aspect: number,
  zoom: number,
): Area {
  const rendered = getEffectiveMediaSize(media, cropWidth);
  const naturalWidth = media.naturalWidth;
  const naturalHeight = media.naturalHeight;

  const croppedAreaPercentages = {
    x: limitArea(100, ((rendered.width - cropSize.width / zoom) / 2 - crop.x / zoom) / rendered.width * 100),
    y: limitArea(100, ((rendered.height - cropSize.height / zoom) / 2 - crop.y / zoom) / rendered.height * 100),
    width: limitArea(100, cropSize.width / rendered.width * 100 / zoom),
    height: limitArea(100, cropSize.height / rendered.height * 100 / zoom),
  };

  const widthInPixels = Math.round(limitArea(naturalWidth, croppedAreaPercentages.width * naturalWidth / 100));
  const heightInPixels = Math.round(limitArea(naturalHeight, croppedAreaPercentages.height * naturalHeight / 100));

  const sizePixels = naturalWidth >= naturalHeight * aspect
    ? { width: Math.round(heightInPixels * aspect), height: heightInPixels }
    : { width: widthInPixels, height: Math.round(widthInPixels / aspect) };

  return {
    x: Math.round(limitArea(naturalWidth - sizePixels.width, croppedAreaPercentages.x * naturalWidth / 100)),
    y: Math.round(limitArea(naturalHeight - sizePixels.height, croppedAreaPercentages.y * naturalHeight / 100)),
    width: sizePixels.width,
    height: sizePixels.height,
  };
}

/**
 * Clamp crop position using horizontal-cover dimensions derived from natural aspect.
 * react-easy-crop's restrictPosition under-estimates pan range for this layout.
 */
export function clampCropPosition(
  position: Point,
  media: MediaSize,
  cropSize: Size,
  cropWidth: number,
  zoom: number,
  options?: { lockX?: boolean },
): Point {
  const effective = getEffectiveMediaSize(media, cropWidth);
  const scaledWidth = effective.width * zoom;
  const scaledHeight = effective.height * zoom;

  const maxX = Math.max(0, (scaledWidth - cropSize.width) / 2);
  const maxY = Math.max(0, (scaledHeight - cropSize.height) / 2);

  const x = options?.lockX || maxX === 0 ? 0 : clamp(position.x, -maxX, maxX);
  const y = maxY === 0 ? 0 : clamp(position.y, -maxY, maxY);

  return { x, y };
}

/**
 * Clamp a pixel crop rect to image bounds for canvas drawImage.
 * When react-easy-crop reports out-of-bounds coords (restrictPosition=false),
 * shift the destination so visible image content still aligns with the crop box.
 */
export function getBoundedCropDrawParams(
  pixelCrop: Area,
  imageWidth: number,
  imageHeight: number,
  outputWidth = pixelCrop.width,
  outputHeight = pixelCrop.height,
): BoundedCropDrawParams {
  const sourceX = Math.max(0, pixelCrop.x);
  const sourceY = Math.max(0, pixelCrop.y);
  const sourceRight = Math.min(pixelCrop.x + pixelCrop.width, imageWidth);
  const sourceBottom = Math.min(pixelCrop.y + pixelCrop.height, imageHeight);

  return {
    outputWidth,
    outputHeight,
    source: {
      x: sourceX,
      y: sourceY,
      width: Math.max(0, sourceRight - sourceX),
      height: Math.max(0, sourceBottom - sourceY),
    },
    dest: {
      x: (sourceX - pixelCrop.x) * (outputWidth / pixelCrop.width),
      y: (sourceY - pixelCrop.y) * (outputHeight / pixelCrop.height),
    },
  };
}
