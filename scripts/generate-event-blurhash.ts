/**
 * Generate blurhash for existing event cover images
 *
 * This script:
 * 1. Finds all events with cover_image but no image_blurhash
 * 2. Downloads each cover image
 * 3. Generates blurhash using the blurhash library
 * 4. Updates the image_blurhash, image_width, and image_height columns
 *
 * Usage:
 *   npx tsx scripts/generate-event-blurhash.ts
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - sharp (already installed via Next.js)
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
 * Generate blurhash from an image URL
 */
async function generateBlurhashFromUrl(imageUrl: string): Promise<string | null> {
  try {
    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Resize to small size (32x32) for performance
    const { data, info } = await sharp(imageBuffer)
      .resize(32, 32, { fit: 'cover' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Generate blurhash (4x4 components for good quality)
    const blurhash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4, // componentX
      4, // componentY
    );

    return blurhash;
  } catch (error) {
    console.warn(`Failed to generate blurhash for ${imageUrl}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get image dimensions from URL
 */
async function getImageDimensions(imageUrl: string): Promise<{ width: number; height: number } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(imageBuffer).metadata();

    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }

    return null;
  } catch (error) {
    console.warn(`Failed to get dimensions for ${imageUrl}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function generateEventBlurhash() {
  try {
    // Get all events with cover_image but no image_blurhash
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, cover_image, image_blurhash, image_width, image_height')
      .not('cover_image', 'is', null)
      .is('image_blurhash', null)
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      process.exit(1);
    }

    if (!events || events.length === 0) {
      console.log('No events found that need blurhash generation');
      return;
    }

    console.log(`Found ${events.length} events that need blurhash generation\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const event of events) {
      if (!event.cover_image) {
        skippedCount++;
        continue;
      }

      try {
        console.log(`Processing event "${event.title}" (ID: ${event.id})...`);
        console.log(`  Cover image: ${event.cover_image}`);

        // Generate blurhash
        const blurhash = await generateBlurhashFromUrl(event.cover_image);
        if (!blurhash) {
          throw new Error('Failed to generate blurhash');
        }

        // Get image dimensions if not already set
        let width = event.image_width;
        let height = event.image_height;
        if (!width || !height) {
          console.log('  Getting image dimensions...');
          const dimensions = await getImageDimensions(event.cover_image);
          if (dimensions) {
            width = dimensions.width;
            height = dimensions.height;
          }
        }

        // Update event with blurhash and dimensions
        const updateData: Record<string, unknown> = {
          image_blurhash: blurhash,
        };

        if (width && height) {
          updateData.image_width = width;
          updateData.image_height = height;
        }

        const { error: updateError } = await supabase
          .from('events')
          .update(updateData)
          .eq('id', event.id);

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }

        successCount++;
        console.log(`  ✅ Generated blurhash: ${blurhash.substring(0, 20)}...`);
        if (width && height) {
          console.log(`  ✅ Dimensions: ${width}x${height}`);
        }
        console.log('');

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        errorCount++;
        console.error('  ❌ Failed:', error instanceof Error ? error.message : error);
        console.log('');
      }
    }

    console.log('\n✨ Blurhash generation complete!');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
  } catch (error) {
    console.error('Error generating blurhash:', error);
    process.exit(1);
  }
}

generateEventBlurhash();
