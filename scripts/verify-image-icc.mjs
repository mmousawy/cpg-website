#!/usr/bin/env node
/**
 * Compare ICC color profile metadata between a Supabase original and its imgproxy WebP transform.
 *
 *   pnpm verify:image-icc -- "https://db.../storage/v1/object/public/user-photos/.../photo.jpg"
 *
 * Optional flags:
 *   --host https://db.creativephotography.group   (default: derived from object URL)
 *   --width 1200
 *   --quality 80
 */
import sharp from 'sharp';

const args = process.argv.slice(2);
const objectUrl = args.find((a) => a !== '--' && !a.startsWith('--'));
const width = Number(args.find((a) => a.startsWith('--width='))?.split('=')[1] ?? 1200);
const quality = Number(args.find((a) => a.startsWith('--quality='))?.split('=')[1] ?? 80);
const hostOverride = args.find((a) => a.startsWith('--host='))?.split('=')[1];

if (!objectUrl) {
  console.error('Usage: pnpm verify:image-icc -- <object-public-url>');
  console.error('Example: pnpm verify:image-icc -- "https://db.creativephotography.group/storage/v1/object/public/user-photos/uuid/photo.jpg"');
  process.exit(1);
}

function toRenderUrl(objectPublicUrl, w, q) {
  const url = new URL(objectPublicUrl);
  url.pathname = url.pathname.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/',
  );
  url.searchParams.set('width', String(w));
  url.searchParams.set('quality', String(q));
  return url.toString();
}

function iccSummary(meta) {
  const icc = meta.icc;
  return {
    space: meta.space ?? '(none)',
    hasIcc: Boolean(icc && icc.length > 0),
    iccBytes: icc?.length ?? 0,
    density: meta.density,
    channels: meta.channels,
    format: meta.format,
  };
}

async function fetchBuffer(url, accept) {
  const res = await fetch(url, {
    headers: accept ? { Accept: accept } : {},
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, contentType };
}

try {
  const renderUrl = toRenderUrl(objectUrl, width, quality);
  const host = hostOverride ?? new URL(objectUrl).origin;

  console.log('Host:', host);
  console.log('Original:', objectUrl);
  console.log('Transform:', renderUrl);
  console.log('');

  const [original, transformed] = await Promise.all([
    fetchBuffer(objectUrl),
    fetchBuffer(renderUrl, 'image/webp'),
  ]);

  const [originalMeta, transformedMeta] = await Promise.all([
    sharp(original.buf).metadata(),
    sharp(transformed.buf).metadata(),
  ]);

  const orig = iccSummary(originalMeta);
  const xform = iccSummary(transformedMeta);

  console.log('Original:', orig);
  console.log('Content-Type:', original.contentType);
  console.log('');
  console.log('Transformed WebP:', xform);
  console.log('Content-Type:', transformed.contentType);
  console.log('');

  const ok =
    orig.hasIcc
    && xform.hasIcc
    && xform.iccBytes > 0
    && orig.space === xform.space;

  if (!orig.hasIcc) {
    console.warn('WARN: Original has no embedded ICC — comparison is inconclusive (untagged sRGB assumed).');
    process.exit(0);
  }

  if (ok) {
    console.log('PASS: Transformed WebP keeps ICC profile (space matches original).');
    process.exit(0);
  }

  if (xform.hasIcc && orig.space !== xform.space) {
    console.error('FAIL: WebP has ICC but colorspace changed:', orig.space, '→', xform.space);
    process.exit(1);
  }

  console.error('FAIL: Transformed WebP is missing ICC profile (imgproxy may still strip profiles).');
  console.error('Set IMGPROXY_STRIP_COLOR_PROFILE=false on imgproxy and purge Cloudflare /render/image/ cache.');
  process.exit(1);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
