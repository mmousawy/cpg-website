import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

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
const BUCKET_NAME = 'event-covers';

// Check if URL is already in Supabase storage
function isSupabaseUrl(url: string | null): boolean {
  if (!url) return false;
  return url.includes('/storage/v1/object/public/') &&
    (url.includes('supabase.co') || url.includes('creativephotography.group'));
}

async function migrateEventCovers() {
  try {
    // Get all events ordered by created_at (newest first)
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, cover_image, image_url, created_at')
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      process.exit(1);
    }

    if (!events || events.length === 0) {
      console.log('No events found');
      return;
    }

    console.log(`Found ${events.length} total events`);

    // Filter to only events that need migration:
    // - Have image_url set (external image)
    // - Don't have cover_image set OR cover_image is not a Supabase URL
    const eventsToMigrate = events.filter(event => {
      // Must have image_url (external image)
      if (!event.image_url) return false;

      // Skip if cover_image is already set and it's a Supabase URL
      if (event.cover_image && isSupabaseUrl(event.cover_image)) return false;

      return true;
    });

    if (eventsToMigrate.length === 0) {
      console.log('No events need migration (all events already have cover_image in Supabase or no external images)');
      return;
    }

    console.log(`Found ${eventsToMigrate.length} events that need migration\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const event of eventsToMigrate) {
      const externalImageUrl = event.image_url;

      if (!externalImageUrl) {
        console.log(`⏭️  Skipping event "${event.title}" - no external image_url`);
        skippedCount++;
        continue;
      }

      // Skip if cover_image is already a Supabase URL
      if (event.cover_image && isSupabaseUrl(event.cover_image)) {
        console.log(`⏭️  Skipping event "${event.title}" - already has Supabase cover_image`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`📥 Downloading cover image for event "${event.title}"...`);
        console.log(`   Source: ${externalImageUrl}`);

        // Download the image
        const response = await fetch(externalImageUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const imageBuffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Determine file extension from content type or URL
        let fileExt = 'jpg';
        if (contentType.includes('png')) fileExt = 'png';
        else if (contentType.includes('webp')) fileExt = 'webp';
        else if (contentType.includes('gif')) fileExt = 'gif';
        else {
          // Try to get extension from URL
          const urlExt = externalImageUrl.split('.').pop()?.split('?')[0];
          if (urlExt && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(urlExt.toLowerCase())) {
            fileExt = urlExt.toLowerCase();
          }
        }

        // Generate filename
        const fileName = `event-${event.id}.${fileExt}`;
        const storagePath = `events/${fileName}`;

        // Upload to Supabase storage
        console.log('📤 Uploading to Supabase storage...');
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, imageBuffer, {
            cacheControl: '31536000', // 1 year cache
            upsert: true, // Overwrite if exists
            contentType,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        // Update event with new Supabase URL in cover_image field
        console.log('💾 Updating event record...');
        const { error: updateError } = await supabase
          .from('events')
          .update({ cover_image: publicUrl })
          .eq('id', event.id);

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }

        migratedCount++;
        console.log(`✅ Migrated event "${event.title}"`);
        console.log(`   New URL: ${publicUrl}\n`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to migrate event "${event.title}":`, error instanceof Error ? error.message : error);
        console.log('');
      }
    }

    console.log('\n✨ Migration complete!');
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
  } catch (error) {
    console.error('Error migrating event covers:', error);
    process.exit(1);
  }
}

migrateEventCovers();
