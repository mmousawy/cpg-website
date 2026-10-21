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

/** Values for the capture-details edit modal (all strings for form inputs). */
export interface ExifEditFormValues {
  make: string;
  model: string;
  lensModel: string;
  iso: string;
  aperture: string;
  exposureTime: string;
  focalLength: string;
  captureTime: string;
  latitude: string;
  longitude: string;
}

export function emptyExifEditFormValues(): ExifEditFormValues {
  return {
    make: '',
    model: '',
    lensModel: '',
    iso: '',
    aperture: '',
    exposureTime: '',
    focalLength: '',
    captureTime: '',
    latitude: '',
    longitude: '',
  };
}

const EXIF_GPS_KEYS = [
  'latitude',
  'longitude',
  'GPSLatitude',
  'GPSLongitude',
  'GPSLatitudeRef',
  'GPSLongitudeRef',
] as const;

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
    const parsed = wallClockInTimeZoneToUtc(
      year,
      month,
      day,
      hour,
      minute,
      second,
      EVENT_TIMEZONE,
    );
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

/** Summary line for bulk edit when multiple photos are selected. */
export function getBulkExifSummaryLabel(photos: Array<{ exif_data?: unknown }>): string {
  if (photos.length === 0) return 'No capture details';

  const summaries = photos.map((p) =>
    getExifSummary(p.exif_data as Record<string, unknown> | null | undefined),
  );
  const anyData = summaries.some((s) => s != null && s.length > 0);
  if (!anyData) return 'No capture details';

  const first = summaries.find((s) => s != null && s.length > 0) ?? null;
  const allMatch = summaries.every((s) => s === first);
  if (allMatch && first) return first;

  return 'Mixed capture details';
}

function getZonedDateParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

/** Wall clock in `timeZone` → UTC instant (iterative; handles DST). */
export function wallClockInTimeZoneToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 4; i++) {
    const zoned = getZonedDateParts(new Date(utcMs), timeZone);
    const zonedAsUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
    );
    const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    utcMs += desiredAsUtc - zonedAsUtc;
  }
  return new Date(utcMs);
}

/** `datetime-local` value for a UTC instant, shown in the group timezone. */
export function formatDateForDatetimeLocal(date: Date, timeZone: string = EVENT_TIMEZONE): string {
  const p = getZonedDateParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Parse `datetime-local` as wall clock in the group timezone. */
export function parseDatetimeLocalInTimeZone(
  value: string,
  timeZone: string = EVENT_TIMEZONE,
): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (
    !Number.isFinite(year)
    || !Number.isFinite(month)
    || !Number.isFinite(day)
    || !Number.isFinite(hour)
    || !Number.isFinite(minute)
  ) {
    return null;
  }
  const parsed = wallClockInTimeZoneToUtc(year, month, day, hour, minute, 0, timeZone);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Shutter speed text → seconds (e.g. `1/250`, `2s`). */
export function parseExposureTimeInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const fraction = trimmed.match(/^1\s*\/\s*(\d+(?:\.\d+)?)\s*s?$/i);
  if (fraction) {
    const denom = Number(fraction[1]);
    return denom > 0 ? 1 / denom : null;
  }

  const seconds = trimmed.match(/^(\d+(?:\.\d+)?)\s*s?$/i);
  if (seconds) {
    const n = Number(seconds[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  return null;
}

export function formatExposureTimeInput(exposureTime: number): string {
  return formatExposure(exposureTime);
}

function trimToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value.trim();
  return '';
}

export function exifToFormValues(
  rawExif: Record<string, unknown> | null | undefined,
): ExifEditFormValues {
  const empty = emptyExifEditFormValues();
  if (!rawExif) return empty;

  const parsed = parseExifData(rawExif);
  if (!parsed) {
    return {
      ...empty,
      make: trimToString(rawExif.Make),
      model: trimToString(rawExif.Model),
      lensModel: trimToString(rawExif.LensModel),
    };
  }

  return {
    make: parsed.make ?? '',
    model: parsed.model ?? '',
    lensModel: parsed.lensModel ?? '',
    iso: parsed.iso != null && Number.isFinite(parsed.iso) ? String(Math.round(parsed.iso)) : '',
    aperture: parsed.aperture != null && Number.isFinite(parsed.aperture)
      ? String(parsed.aperture)
      : '',
    exposureTime: parsed.exposureTime != null && Number.isFinite(parsed.exposureTime)
      ? formatExposureTimeInput(parsed.exposureTime)
      : '',
    focalLength: parsed.focalLength != null && Number.isFinite(parsed.focalLength)
      ? String(parsed.focalLength)
      : '',
    captureTime: parsed.dateTaken ? formatDateForDatetimeLocal(parsed.dateTaken) : '',
    latitude: parsed.latitude != null ? String(parsed.latitude) : '',
    longitude: parsed.longitude != null ? String(parsed.longitude) : '',
  };
}

function setOrDeleteString(target: Record<string, unknown>, key: string, value: string) {
  const trimmed = value.trim();
  if (trimmed) {
    target[key] = trimmed;
  } else {
    delete target[key];
  }
}

function setOrDeleteNumber(target: Record<string, unknown>, key: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    delete target[key];
    return;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return;
  target[key] = n;
}

function clearGpsKeys(target: Record<string, unknown>) {
  for (const key of EXIF_GPS_KEYS) {
    delete target[key];
  }
}

/**
 * Merge modal form values into existing EXIF JSON. Unknown keys are preserved.
 * Returns null when no keys remain.
 */
/** Per-field form values shared by every photo; mixed fields are empty strings. */
export function getCommonExifFormValues(
  photos: Array<{ exif_data?: unknown }>,
): ExifEditFormValues {
  const empty = emptyExifEditFormValues();
  if (photos.length === 0) return empty;

  const allValues = photos.map((p) =>
    exifToFormValues(p.exif_data as Record<string, unknown> | null | undefined),
  );

  const result = { ...empty };
  for (const key of Object.keys(empty) as (keyof ExifEditFormValues)[]) {
    const first = allValues[0][key];
    if (allValues.every((v) => v[key] === first)) {
      result[key] = first;
    }
  }
  return result;
}

export type MergeExifEditsPartialOptions = {
  /** When true, remove GPS from every photo (bulk “Remove location”). */
  clearGps?: boolean;
};

/**
 * Bulk merge: only non-empty form fields overwrite existing EXIF. Empty fields are left unchanged.
 */
export function mergeExifEditsPartial(
  existing: Record<string, unknown> | null | undefined,
  form: ExifEditFormValues,
  options: MergeExifEditsPartialOptions = {},
): Record<string, unknown> | null {
  const merged: Record<string, unknown> =
    existing && typeof existing === 'object' ? { ...existing } : {};

  const applyString = (key: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) merged[key] = trimmed;
  };

  const applyNumber = (key: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const n = Number(trimmed);
    if (Number.isFinite(n)) merged[key] = n;
  };

  applyString('Make', form.make);
  applyString('Model', form.model);
  applyString('LensModel', form.lensModel);
  applyNumber('ISO', form.iso);
  applyNumber('FNumber', form.aperture);

  const exposureTrimmed = form.exposureTime.trim();
  if (exposureTrimmed) {
    const exposureSeconds = parseExposureTimeInput(exposureTrimmed);
    if (exposureSeconds != null) {
      merged.ExposureTime = exposureSeconds;
    }
  }

  applyNumber('FocalLength', form.focalLength);

  const captureTrimmed = form.captureTime.trim();
  if (captureTrimmed) {
    const captureDate = parseDatetimeLocalInTimeZone(captureTrimmed);
    if (captureDate) {
      merged.DateTimeOriginal = captureDate.toISOString();
    }
  }

  if (options.clearGps) {
    clearGpsKeys(merged);
  } else {
    const latTrimmed = form.latitude.trim();
    const lngTrimmed = form.longitude.trim();
    if (latTrimmed && lngTrimmed) {
      const lat = Number(latTrimmed);
      const lng = Number(lngTrimmed);
      if (
        Number.isFinite(lat)
        && Number.isFinite(lng)
        && Math.abs(lat) <= 90
        && Math.abs(lng) <= 180
      ) {
        clearGpsKeys(merged);
        merged.latitude = lat;
        merged.longitude = lng;
      }
    }
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

export function mergeExifEdits(
  existing: Record<string, unknown> | null | undefined,
  form: ExifEditFormValues,
): Record<string, unknown> | null {
  const merged: Record<string, unknown> =
    existing && typeof existing === 'object' ? { ...existing } : {};

  setOrDeleteString(merged, 'Make', form.make);
  setOrDeleteString(merged, 'Model', form.model);
  setOrDeleteString(merged, 'LensModel', form.lensModel);
  setOrDeleteNumber(merged, 'ISO', form.iso);
  setOrDeleteNumber(merged, 'FNumber', form.aperture);

  const exposureTrimmed = form.exposureTime.trim();
  if (!exposureTrimmed) {
    delete merged.ExposureTime;
  } else {
    const exposureSeconds = parseExposureTimeInput(exposureTrimmed);
    if (exposureSeconds != null) {
      merged.ExposureTime = exposureSeconds;
    }
  }

  setOrDeleteNumber(merged, 'FocalLength', form.focalLength);

  const captureTrimmed = form.captureTime.trim();
  if (!captureTrimmed) {
    delete merged.DateTimeOriginal;
  } else {
    const captureDate = parseDatetimeLocalInTimeZone(captureTrimmed);
    if (captureDate) {
      merged.DateTimeOriginal = captureDate.toISOString();
    }
  }

  const latTrimmed = form.latitude.trim();
  const lngTrimmed = form.longitude.trim();
  if (latTrimmed && lngTrimmed) {
    const lat = Number(latTrimmed);
    const lng = Number(lngTrimmed);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      clearGpsKeys(merged);
      merged.latitude = lat;
      merged.longitude = lng;
    }
  } else if (!latTrimmed && !lngTrimmed) {
    clearGpsKeys(merged);
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

/** True when make, model, or lens changed in a way that affects gear catalog ingest. */
export function exifGearFieldsChanged(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): boolean {
  const keys = ['Make', 'Model', 'LensModel'] as const;
  for (const key of keys) {
    const a = trimToString(before?.[key]).toLowerCase();
    const b = trimToString(after?.[key]).toLowerCase();
    if (a !== b) return true;
  }
  return false;
}
