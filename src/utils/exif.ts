/**
 * EXIF Data Utilities
 * Unified utilities for parsing and formatting EXIF metadata from photos.
 */

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

  // Date
  if (exif.DateTimeOriginal && typeof exif.DateTimeOriginal === 'string') {
    try {
      data.dateTaken = new Date(exif.DateTimeOriginal);
    } catch {
      // Invalid date, skip
    }
  }

  // GPS
  if (exif.GPSLatitude != null) {
    data.latitude = Number(exif.GPSLatitude);
  }
  if (exif.GPSLongitude != null) {
    data.longitude = Number(exif.GPSLongitude);
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
    return `${exposureTime}s`;
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
 * Format parsed EXIF data into display-ready strings.
 */
export function formatExifData(data: ExifData | null): FormattedExif | null {
  if (!data) return null;

  const formatted: FormattedExif = {};

  // Camera line: "Make Model" or just one of them
  if (data.make && data.model) {
    // Avoid duplication if model already contains make name
    if (data.model.toLowerCase().includes(data.make.toLowerCase())) {
      formatted.camera = data.model;
    } else {
      formatted.camera = `${data.make} ${data.model}`;
    }
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

  // Date taken
  if (data.dateTaken) {
    formatted.dateTaken = data.dateTaken.toLocaleString();
  }

  // Location
  if (data.latitude != null && data.longitude != null) {
    formatted.location = { lat: data.latitude, lng: data.longitude };
  }

  // Dimensions
  if (data.width && data.height) {
    formatted.dimensions = `${data.width} × ${data.height}`;
  }

  // Build camera line
  formatted.cameraLine = formatted.camera;

  // Build settings line - avoid duplicates from lens model
  const settings: string[] = [];

  if (formatted.iso) {
    settings.push(formatted.iso);
  }

  // Only add aperture if lens model doesn't already contain it
  if (formatted.aperture && (!data.lensModel || !lensModelContainsAperture(data.lensModel))) {
    settings.push(formatted.aperture);
  }

  if (formatted.exposure) {
    settings.push(formatted.exposure);
  }

  // Only add focal length if lens model doesn't already contain it
  if (formatted.focalLength && (!data.lensModel || !lensModelContainsFocalLength(data.lensModel))) {
    settings.push(formatted.focalLength);
  }

  if (settings.length > 0) {
    formatted.settingsLine = settings.join(' · ');
  }

  // Build summary: Camera · Lens · Settings
  const summaryParts: string[] = [];
  if (formatted.camera) summaryParts.push(formatted.camera);
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
