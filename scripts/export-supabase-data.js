#!/usr/bin/env node

/**
 * Export Supabase data before migration
 * Run: node scripts/export-supabase-data.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportData() {
  console.log('🚀 Starting Supabase data export...\n');

  const exportDir = path.join(__dirname, '..', 'supabase-export');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  try {
    // Export profiles
    console.log('📥 Exporting profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) throw profilesError;
    fs.writeFileSync(
      path.join(exportDir, 'profiles.json'),
      JSON.stringify(profiles, null, 2),
    );
    console.log(`✅ Exported ${profiles?.length || 0} profiles`);

    // Export events
    console.log('📥 Exporting events...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*');

    if (eventsError) throw eventsError;
    fs.writeFileSync(
      path.join(exportDir, 'events.json'),
      JSON.stringify(events, null, 2),
    );
    console.log(`✅ Exported ${events?.length || 0} events`);

    // Export RSVPs
    console.log('📥 Exporting RSVPs...');
    const { data: rsvps, error: rsvpsError } = await supabase
      .from('events_rsvps')
      .select('*');

    if (rsvpsError) throw rsvpsError;
    fs.writeFileSync(
      path.join(exportDir, 'events_rsvps.json'),
      JSON.stringify(rsvps, null, 2),
    );
    console.log(`✅ Exported ${rsvps?.length || 0} RSVPs`);

    // Export albums
    console.log('📥 Exporting albums...');
    const { data: albums, error: albumsError } = await supabase
      .from('albums')
      .select('*');

    if (albumsError) throw albumsError;
    fs.writeFileSync(
      path.join(exportDir, 'albums.json'),
      JSON.stringify(albums, null, 2),
    );
    console.log(`✅ Exported ${albums?.length || 0} albums`);

    // Export album photos
    console.log('📥 Exporting album photos...');
    const { data: photos, error: photosError } = await supabase
      .from('album_photos')
      .select('*');

    if (photosError) throw photosError;
    fs.writeFileSync(
      path.join(exportDir, 'album_photos.json'),
      JSON.stringify(photos, null, 2),
    );
    console.log(`✅ Exported ${photos?.length || 0} photos`);

    // Export album tags
    console.log('📥 Exporting album tags...');
    const { data: tags, error: tagsError } = await supabase
      .from('album_tags')
      .select('*');

    if (tagsError) throw tagsError;
    fs.writeFileSync(
      path.join(exportDir, 'album_tags.json'),
      JSON.stringify(tags, null, 2),
    );
    console.log(`✅ Exported ${tags?.length || 0} tags`);

    // Export album comments (skip if table doesn't exist)
    console.log('📥 Exporting album comments...');
    const { data: comments, error: commentsError } = await supabase
      .from('album_comments')
      .select('*');

    if (commentsError && commentsError.code === 'PGRST205') {
      console.log('⚠️  Table album_comments does not exist, skipping...');
    } else if (commentsError) {
      throw commentsError;
    } else {
      fs.writeFileSync(
        path.join(exportDir, 'album_comments.json'),
        JSON.stringify(comments, null, 2),
      );
      console.log(`✅ Exported ${comments?.length || 0} comments`);
    }

    console.log('\n✅ Export completed successfully!');
    console.log(`📁 Data saved to: ${exportDir}`);
    console.log('\nNext steps:');
    console.log('1. Download storage files from Supabase dashboard');
    console.log('2. Upload this export folder to your VPS');
    console.log('3. Run the import script on the VPS');

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportData();
