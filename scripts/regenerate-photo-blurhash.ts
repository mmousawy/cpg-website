/**
 * Regenerate blurhash for a specific photo by short_id
 *
 * Usage:
 *   npx tsx scripts/regenerate-photo-blurhash.ts <short_id>
 *   npx tsx scripts/regenerate-photo-blurhash.ts 44lft
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { encode } from 'blurhash';
import { config } from 'dotenv';
import sharp from 'sharp';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Calculate blurhash dimensions preserving aspect ratio.
 * Same logic as src/utils/decodeBlurhash.ts getBlurhashDimensions
 */
function getBlurhashDimensions(
  width: number,
  height: number,
  maxSize: number = 32,
): { width: number; height: number } {
  if (!width || !height || width <= 0 || height <= 0) {
    return { width: maxSize, height: maxSize };
  }

  if (width > height) {
    return {
      width: maxSize,
      height: Math.max(1, Math.round((height / width) * maxSize)),
    };
  } else if (height > width) {
    return {
      width: Math.max(1, Math.round((width / height) * maxSize)),
      height: maxSize,
    };
  } else {
    return { width: maxSize, height: maxSize };
  }
}

/**
 * Generate blurhash from an image URL, preserving aspect ratio
 */
async function generateBlurhashFromUrl(imageUrl: string): Promise<{
  blurhash: string;
  width: number;
  height: number;
} | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Get original dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || 32;
    const originalHeight = metadata.height || 32;

    // Calculate dimensions preserving aspect ratio (320px for highest quality)
    const dims = getBlurhashDimensions(originalWidth, originalHeight, 320);

    // Resize preserving aspect ratio
    const { data, info } = await sharp(imageBuffer)
      .resize(dims.width, dims.height, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Generate blurhash with minimal component count for smoothest result
    // 2x2 = 4 color regions, very smooth gradients
    const blurhash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4, // componentX
      4, // componentY
    );

    return {
      blurhash,
      width: originalWidth,
      height: originalHeight,
    };
  } catch (error) {
    console.error('Failed to generate blurhash:', error instanceof Error ? error.message : error);
    return null;
  }
}

async function regeneratePhotoBlurhash(shortId: string) {
  console.log(`\nLooking up photo with short_id: ${shortId}...\n`);

  // Fetch the photo
  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .select('id, short_id, url, title, blurhash, width, height')
    .eq('short_id', shortId)
    .single();

  if (photoError || !photo) {
    console.error('Photo not found:', photoError?.message || 'No photo with that short_id');
    process.exit(1);
  }

  console.log(`Found photo: "${photo.title || '(untitled)'}"`);
  console.log(`  URL: ${photo.url}`);
  console.log(`  Current dimensions: ${photo.width}x${photo.height}`);
  console.log(`  Current blurhash: ${photo.blurhash || '(none)'}`);
  console.log('');

  // Generate new blurhash
  console.log('Generating new blurhash...');
  const result = await generateBlurhashFromUrl(photo.url);

  if (!result) {
    console.error('Failed to generate blurhash');
    process.exit(1);
  }

  console.log(`  New dimensions: ${result.width}x${result.height}`);
  console.log(`  New blurhash: ${result.blurhash}`);
  console.log('');

  // Update the photo
  console.log('Updating photo in database...');
  const { error: updateError } = await supabase
    .from('photos')
    .update({
      blurhash: result.blurhash,
      width: result.width,
      height: result.height,
    })
    .eq('id', photo.id);

  if (updateError) {
    console.error('Failed to update photo:', updateError.message);
    process.exit(1);
  }

  console.log('✅ Photo updated successfully!');
  console.log('');
  console.log('Note: You may need to clear your browser cache or hard refresh to see the change.');
}

// Get short_id from command line
const shortId = process.argv[2];

if (!shortId) {
  console.error('Usage: npx tsx scripts/regenerate-photo-blurhash.ts <short_id>');
  console.error('Example: npx tsx scripts/regenerate-photo-blurhash.ts 44lft');
  process.exit(1);
}

regeneratePhotoBlurhash(shortId);
