/**
 * EXIF Data Utilities
 * Unified utilities for parsing and formatting EXIF metadata from photos.
 */

import { EVENT_TIMEZONE } from '@/lib/events/status';

export interface ExifData {
  // Camera info
  make?: string;
  model?: string;
  lensModel?: string;

  // Capture settings
  iso?: number;
  aperture?: number;
  exposureTime?: number;
  focalLength?: number;

  // Date
  dateTaken?: Date;

  // GPS
  latitude?: number;
  longitude?: number;

  // Dimensions
  width?: number;
  height?: number;
}

export interface FormattedExif {
  // Individual formatted values
  camera?: string;
  lens?: string;
  iso?: string;
  aperture?: string;
  exposure?: string;
  focalLength?: string;
  dateTaken?: string;
  location?: { lat: number; lng: number };
  locationLabel?: string;
  dimensions?: string;

  // Combined strings for display
  cameraLine?: string;
  settingsLine?: string;
  summary?: string;
}

/**
 * Parse raw EXIF data from the database into a structured object.
 */
export function parseExifData(exif: Record<string, unknown> | null | undefined): ExifData | null {
  if (!exif) return null;

  const data: ExifData = {};

  // Camera info
  if (exif.Make && typeof exif.Make === 'string') {
    data.make = exif.Make.trim();
  }
  if (exif.Model && typeof exif.Model === 'string') {
    data.model = exif.Model.trim();
  }
  if (exif.LensModel && typeof exif.LensModel === 'string') {
    data.lensModel = exif.LensModel.trim();
  }

  // Capture settings
  if (exif.ISO != null) {
    data.iso = Number(exif.ISO);
  }
  if (exif.FNumber != null) {
    data.aperture = Number(exif.FNumber);
  }
  if (exif.ExposureTime != null) {
    data.exposureTime = Number(exif.ExposureTime);
  }
  if (exif.FocalLength != null) {
    data.focalLength = Number(exif.FocalLength);
  }

  const dateTaken = parseExifDate(exif.DateTimeOriginal);
  if (dateTaken) {
    data.dateTaken = dateTaken;
  }

  const coordinates = readGpsCoordinates(exif);
  if (coordinates) {
    data.latitude = coordinates.latitude;
    data.longitude = coordinates.longitude;
  }

  // Dimensions
  if (exif.ImageWidth != null) {
    data.width = Number(exif.ImageWidth);
  }
  if (exif.ImageHeight != null) {
    data.height = Number(exif.ImageHeight);
  }

  return Object.keys(data).length > 0 ? data : null;
}

/**
 * Format aperture value with appropriate precision.
 * Standard aperture values: f/1.4, f/2, f/2.8, f/4, f/5.6, f/8, f/11, f/16, f/22
 * We round to 1 decimal place for non-standard values.
 */
export function formatAperture(aperture: number): string {
  // If it's a whole number, display without decimal
  if (Number.isInteger(aperture)) {
    return `f/${aperture}`;
  }
  // Round to 1 decimal place
  const rounded = Math.round(aperture * 10) / 10;
  // If rounding makes it a whole number, display without decimal
  if (Number.isInteger(rounded)) {
    return `f/${rounded}`;
  }
  return `f/${rounded.toFixed(1)}`;
}

/**
 * Format exposure time as a fraction or seconds.
 */
export function formatExposure(exposureTime: number): string {
  if (exposureTime >= 1) {
    return `${parseFloat(exposureTime.toFixed(2))}s`;
  }
  // Express as fraction (1/X)
  const denominator = Math.round(1 / exposureTime);
  return `1/${denominator}s`;
}

/**
 * Format focal length with appropriate precision.
 */
export function formatFocalLength(focalLength: number): string {
  // Round to 1 decimal if needed, but show whole numbers without decimals
  const rounded = Math.round(focalLength * 10) / 10;
  if (Number.isInteger(rounded)) {
    return `${rounded}mm`;
  }
  return `${rounded.toFixed(1)}mm`;
}

/**
 * Format ISO value.
 */
export function formatISO(iso: number): string {
  return `ISO ${Math.round(iso)}`;
}

/**
 * Camera clock time, shown in the group's timezone.
 * EXIF dates are stored as UTC after the uploader's browser reads the camera clock as local time.
 */
export function formatCaptureTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIMEZONE,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function parseExifDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const exifMatch = trimmed.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (exifMatch) {
    const year = Number(exifMatch[1]);
    const month = Number(exifMatch[2]);
    const day = Number(exifMatch[3]);
    const hour = Number(exifMatch[4]);
    const minute = Number(exifMatch[5]);
    const second = Number(exifMatch[6] ?? 0);
    const parsed = new Date(year, month - 1, day, hour, minute, second);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readCoordinate(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.some((part) => part == null || part === '')) return null;

  const parts = value.slice(0, 3).map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return null;

  const [degrees = 0, minutes = 0, seconds = 0] = parts;
  const sign = degrees < 0 ? -1 : 1;
  return sign * (Math.abs(degrees) + Math.abs(minutes) / 60 + Math.abs(seconds) / 3600);
}

function applyHemisphere(value: number, ref: unknown, negativeRef: string): number {
  if (typeof ref === 'string' && ref.trim().toUpperCase() === negativeRef && value > 0) {
    return -value;
  }
  return value;
}

function readGpsCoordinates(exif: Record<string, unknown>): { latitude: number; longitude: number } | null {
  let latitude = readCoordinate(exif.latitude);
  let longitude = readCoordinate(exif.longitude);

  if (latitude == null) {
    const fromGps = readCoordinate(exif.GPSLatitude);
    latitude = fromGps == null ? null : applyHemisphere(fromGps, exif.GPSLatitudeRef, 'S');
  }
  if (longitude == null) {
    const fromGps = readCoordinate(exif.GPSLongitude);
    longitude = fromGps == null ? null : applyHemisphere(fromGps, exif.GPSLongitudeRef, 'W');
  }

  if (
    latitude == null
    || longitude == null
    || Math.abs(latitude) > 90
    || Math.abs(longitude) > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function formatGpsLabel(latitude: number, longitude: number): string {
  const latitudeHemisphere = latitude >= 0 ? 'N' : 'S';
  const longitudeHemisphere = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(5)}° ${latitudeHemisphere}, ${Math.abs(longitude).toFixed(5)}° ${longitudeHemisphere}`;
}

/**
 * Check if a lens model string already contains aperture info.
 * Many phone cameras include this in the lens model like "iPhone 17 Pro back triple camera 16.891mm f/2.8"
 */
function lensModelContainsAperture(lensModel: string): boolean {
  return /f\/[\d.]+/.test(lensModel);
}

/**
 * Check if a lens model string already contains focal length info.
 */
function lensModelContainsFocalLength(lensModel: string): boolean {
  return /[\d.]+mm/.test(lensModel);
}

/**
 * True when the model already identifies the make (e.g. "iPhone" implies Apple).
 */
function makeIsImpliedByModel(make: string, model: string): boolean {
  const makeLower = make.toLowerCase();
  const modelLower = model.toLowerCase();
  if (modelLower.includes(makeLower)) return true;
  return makeLower === 'apple' && /iphone|ipad|ipod/.test(modelLower);
}

/**
 * True when the lens string already names the camera, so showing both is redundant.
 */
function lensIncludesCameraName(lensModel: string, camera: string, model?: string): boolean {
  const lensLower = lensModel.toLowerCase();
  if (model && lensLower.includes(model.toLowerCase())) return true;
  return lensLower.includes(camera.toLowerCase());
}

/**
 * Format parsed EXIF data into display-ready strings.
 */
export function formatExifData(data: ExifData | null): FormattedExif | null {
  if (!data) return null;

  const formatted: FormattedExif = {};

  // Camera line: "Make Model" or just one of them
  if (data.make && data.model) {
    formatted.camera = makeIsImpliedByModel(data.make, data.model)
      ? data.model
      : `${data.make} ${data.model}`;
  } else if (data.make) {
    formatted.camera = data.make;
  } else if (data.model) {
    formatted.camera = data.model;
  }

  // Lens
  if (data.lensModel) {
    formatted.lens = data.lensModel;
  }

  // Individual settings
  if (data.iso != null) {
    formatted.iso = formatISO(data.iso);
  }
  if (data.aperture != null) {
    formatted.aperture = formatAperture(data.aperture);
  }
  if (data.exposureTime != null) {
    formatted.exposure = formatExposure(data.exposureTime);
  }
  if (data.focalLength != null) {
    formatted.focalLength = formatFocalLength(data.focalLength);
  }

  if (data.dateTaken) {
    formatted.dateTaken = formatCaptureTime(data.dateTaken);
  }

  if (
    data.latitude != null
    && data.longitude != null
    && Number.isFinite(data.latitude)
    && Number.isFinite(data.longitude)
  ) {
    formatted.location = { lat: data.latitude, lng: data.longitude };
    formatted.locationLabel = formatGpsLabel(data.latitude, data.longitude);
  }

  // Dimensions
  if (data.width && data.height) {
    formatted.dimensions = `${data.width} × ${data.height}`;
  }

  // Build camera line
  formatted.cameraLine = formatted.camera;

  // Exposure, ISO, aperture, then focal length. Skip values already written into the lens name.
  const settings: string[] = [];

  if (formatted.exposure) {
    settings.push(formatted.exposure);
  }

  if (formatted.iso) {
    settings.push(formatted.iso);
  }

  if (formatted.aperture && (!data.lensModel || !lensModelContainsAperture(data.lensModel))) {
    settings.push(formatted.aperture);
  }

  if (formatted.focalLength && (!data.lensModel || !lensModelContainsFocalLength(data.lensModel))) {
    settings.push(formatted.focalLength);
  }

  if (settings.length > 0) {
    formatted.settingsLine = settings.join(', ');
  }

  // Build summary: Camera · Lens · Settings
  const summaryParts: string[] = [];
  const lensAlreadyNamesCamera = !!(
    formatted.camera
    && formatted.lens
    && lensIncludesCameraName(formatted.lens, formatted.camera, data.model)
  );
  if (formatted.camera && !lensAlreadyNamesCamera) summaryParts.push(formatted.camera);
  if (formatted.lens) summaryParts.push(formatted.lens);
  if (formatted.settingsLine) summaryParts.push(formatted.settingsLine);

  if (summaryParts.length > 0) {
    formatted.summary = summaryParts.join(' · ');
  }

  return Object.keys(formatted).length > 0 ? formatted : null;
}

/**
 * Convenience function to get formatted EXIF data directly from raw database data.
 */
export function getFormattedExif(rawExif: Record<string, unknown> | null | undefined): FormattedExif | null {
  const parsed = parseExifData(rawExif);
  return formatExifData(parsed);
}

/**
 * Get a summary string for display (e.g., in photo cards, captions).
 * Returns null if no EXIF data is available.
 */
export function getExifSummary(rawExif: Record<string, unknown> | null | undefined): string | null {
  const formatted = getFormattedExif(rawExif);
  return formatted?.summary || null;
}
