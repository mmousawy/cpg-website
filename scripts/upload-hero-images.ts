import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

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
const BUCKET_NAME = 'cpg-public';
const HERO_IMAGES_DIR = join(process.cwd(), 'public', 'gallery');

async function uploadHeroImages() {
  try {
    // Read all hero images from public/gallery
    const files = await readdir(HERO_IMAGES_DIR);
    const heroImages = files.filter(file => file.startsWith('home-hero') && file.endsWith('.jpg'));

    if (heroImages.length === 0) {
      console.log('No hero images found in public/gallery/');
      return;
    }

    console.log(`Found ${heroImages.length} hero images to upload\n`);

    const uploadedUrls: string[] = [];

    for (const fileName of heroImages) {
      const filePath = join(HERO_IMAGES_DIR, fileName);
      const fileBuffer = await readFile(filePath);

      // Upload to Supabase storage (Node.js Buffer works directly)
      const storagePath = `hero/${fileName}`;

      console.log(`Uploading ${fileName}...`);
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          cacheControl: '31536000', // 1 year cache
          upsert: true, // Overwrite if exists
          contentType: 'image/jpeg',
        });

      if (error) {
        console.error(`❌ Failed to upload ${fileName}:`, error.message);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      uploadedUrls.push(publicUrl);
      console.log(`✅ Uploaded ${fileName}`);
      console.log(`   URL: ${publicUrl}\n`);
    }

    console.log('✨ All hero images uploaded!');
    console.log('\nUpdate src/app/page.tsx heroImages array with these URLs:');
    console.log('const heroImages = [');
    uploadedUrls.forEach(url => {
      console.log(`  '${url}',`);
    });
    console.log('];');
  } catch (error) {
    console.error('Error uploading hero images:', error);
    process.exit(1);
  }
}

uploadHeroImages();
