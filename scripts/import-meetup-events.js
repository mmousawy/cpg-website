#!/usr/bin/env node

/**
 * Import Meetup events data into Supabase database
 * Run: node scripts/import-meetup-events.js
 *
 * Prerequisites:
 * 1. First run: node scripts/scrape-meetup-events.js
 * 2. Ensure .env.local has SUPABASE credentials (will use prod if available)
 *
 * Options:
 *   --dry-run     Show what would be imported without making changes
 *   --prod        Force use of production database (requires SUPABASE_SERVICE_ROLE_KEY)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const useProd = args.includes('--prod');

// Determine which credentials to use
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// For production, prefer service role key for insert permissions
if (useProd) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  --prod specified but SUPABASE_SERVICE_ROLE_KEY not found');
    console.warn('   Will use anon key, but inserts may fail without proper RLS policies');
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL');
  console.error('   Required: SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Load scraped events data
 */
function loadEventsData() {
  const dataPath = path.join(__dirname, 'meetup-events-data.json');

  if (!fs.existsSync(dataPath)) {
    console.error('❌ Events data file not found!');
    console.error('   Please run first: node scripts/scrape-meetup-events.js');
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

/**
 * Check if event already exists by slug
 */
async function eventExists(slug) {
  const { data, error } = await supabase
    .from('events')
    .select('id, slug')
    .eq('slug', slug)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found (that's fine)
    console.error(`  ⚠️  Error checking event existence:`, error.message);
  }

  return data !== null;
}

/**
 * Insert a single event into the database
 */
async function insertEvent(eventData) {
  const {
    title,
    description,
    date,
    time,
    location,
    slug,
    image_url,
    meetup_url,
  } = eventData;

  const insertData = {
    title,
    description,
    date,
    time,
    location,
    slug,
    image_url,
    // Store meetup URL in cover_image field temporarily for reference
    // (you can adjust this based on your needs)
    cover_image: meetup_url,
  };

  const { data, error } = await supabase
    .from('events')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function main() {
  console.log('📥 Importing Meetup events into database...\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  console.log(`📡 Database: ${supabaseUrl}`);
  console.log(`🔑 Using: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key' : 'Anon Key'}\n`);

  const events = loadEventsData();
  console.log(`📋 Found ${events.length} events to import\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const event of events) {
    const eventName = event.title || event.slug;

    // Check if event already exists
    const exists = await eventExists(event.slug);

    if (exists) {
      console.log(`⏭️  Skipping (exists): ${eventName}`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`📝 Would import: ${eventName}`);
      console.log(`   📅 ${event.date} at ${event.time}`);
      console.log(`   📍 ${event.location?.split('\n')[0] || 'No location'}`);
      if (event.image_url) console.log(`   🖼️  ${event.image_url.substring(0, 60)}...`);
      imported++;
      continue;
    }

    try {
      const inserted = await insertEvent(event);
      console.log(`✅ Imported: ${eventName} (ID: ${inserted.id})`);
      imported++;
    } catch (error) {
      console.error(`❌ Failed: ${eventName}`);
      console.error(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log('📊 Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Failed:   ${failed}`);

  if (dryRun) {
    console.log('\n💡 To actually import, run without --dry-run:');
    console.log('   node scripts/import-meetup-events.js');
  }
}

main().catch(console.error);
