#!/usr/bin/env node

/**
 * Scrape Meetup.com event pages and extract event data
 * Run: node scripts/scrape-meetup-events.js
 *
 * This script fetches event data from Meetup URLs and saves it to a JSON file.
 */

const fs = require('fs');
const path = require('path');

// List of Meetup event URLs (from old to new)
const MEETUP_URLS = [
  'https://www.meetup.com/creative-photography-group/events/303702069/',
  'https://www.meetup.com/creative-photography-group/events/304567740/',
  'https://www.meetup.com/creative-photography-group/events/304932353/',
  'https://www.meetup.com/creative-photography-group/events/305298497/',
  'https://www.meetup.com/creative-photography-group/events/305844738/',
  'https://www.meetup.com/creative-photography-group/events/306532151/',
  'https://www.meetup.com/creative-photography-group/events/307031366/',
  'https://www.meetup.com/creative-photography-group/events/307635890/',
  'https://www.meetup.com/creative-photography-group/events/307527064/',
  'https://www.meetup.com/creative-photography-group/events/308391100/',
  'https://www.meetup.com/creative-photography-group/events/309388911/',
  'https://www.meetup.com/creative-photography-group/events/309109017/',
  'https://www.meetup.com/creative-photography-group/events/310935508/',
  'https://www.meetup.com/creative-photography-group/events/311517314/',
  'https://www.meetup.com/creative-photography-group/events/311957410/',
  'https://www.meetup.com/creative-photography-group/events/312350480/',
];

/**
 * Generate a URL-friendly slug from a title
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .trim()
    .substring(0, 80);        // Limit length
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\"/g, '"');
}

/**
 * Parse date string like "Sat, Nov 22, 2025 · 1:00 PM to 4:00 PM CET"
 */
function parseMeetupDateTime(dateStr) {
  if (!dateStr) return { date: null, time: null };

  // Clean the string
  dateStr = decodeHtmlEntities(dateStr).trim();

  // Match pattern: "Sat, Nov 22, 2025 · 1:00 PM"
  // Or: "Saturday, November 22, 2025 · 1:00 PM"
  const dateMatch = dateStr.match(/(\w+),?\s+(\w+)\s+(\d+),?\s+(\d{4})/);
  const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

  if (!dateMatch) return { date: null, time: null };

  const monthNames = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12',
  };

  const month = monthNames[dateMatch[2].toLowerCase()];
  const day = dateMatch[3].padStart(2, '0');
  const year = dateMatch[4];

  const date = `${year}-${month}-${day}`;

  let time = null;
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2];
    const ampm = timeMatch[3].toUpperCase();

    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    time = `${hours.toString().padStart(2, '0')}:${minutes}:00`;
  }

  return { date, time };
}

/**
 * Extract data from Meetup's NEXT_DATA JSON (if available)
 */
function extractFromNextData(html) {
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const eventData = data?.props?.pageProps?.event;
      if (eventData) {
        return eventData;
      }
    } catch (e) {
      // Failed to parse NEXT_DATA
    }
  }
  return null;
}

/**
 * Extract Apollo state data from HTML
 */
function extractFromApolloState(html) {
  // Look for Apollo cache or similar React state
  const apolloMatch = html.match(/__APOLLO_STATE__\s*=\s*({[\s\S]*?});/);
  if (apolloMatch) {
    try {
      return JSON.parse(apolloMatch[1]);
    } catch (e) {
      // Failed to parse
    }
  }
  return null;
}

/**
 * Extract title from various sources in HTML
 */
function extractTitle(html) {
  // Try h1 tag (Meetup uses h1 for event title)
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match && h1Match[1].trim() !== 'Meetup') {
    return decodeHtmlEntities(h1Match[1].trim());
  }

  // Try og:title
  const ogMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogMatch && !ogMatch[1].includes('| Meetup')) {
    return decodeHtmlEntities(ogMatch[1].trim());
  }

  // Try title tag and clean it
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    let title = titleMatch[1].replace(/\s*[|·-]\s*Meetup.*$/i, '').trim();
    if (title && title !== 'Meetup') {
      return decodeHtmlEntities(title);
    }
  }

  return null;
}

/**
 * Extract date/time from HTML
 */
function extractDateTime(html) {
  // Look for time element or date display
  // Pattern: "Sat, Nov 22, 2025 · 1:00 PM"
  const timePatterns = [
    // Icon + date pattern in Meetup
    /calendar[^>]*>[\s\S]*?(\w{3},?\s+\w+\s+\d+,?\s+\d{4}\s*[·•]\s*\d{1,2}:\d{2}\s*(?:AM|PM))/i,
    // Just the date pattern
    /(\w{3},?\s+\w+\s+\d+,?\s+\d{4})\s*[·•]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i,
    // Full weekday
    /(\w+day,?\s+\w+\s+\d+,?\s+\d{4})\s*[·•]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i,
  ];

  for (const pattern of timePatterns) {
    const match = html.match(pattern);
    if (match) {
      const dateTimeStr = match[0];
      return parseMeetupDateTime(dateTimeStr);
    }
  }

  // Try finding in JSON-LD
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      if (jsonLd.startDate) {
        const dt = new Date(jsonLd.startDate);
        if (!isNaN(dt.getTime())) {
          const date = dt.toISOString().split('T')[0];
          const time = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:00`;
          return { date, time };
        }
      }
    } catch (e) {
      // Failed to parse JSON-LD
    }
  }

  return { date: null, time: null };
}

/**
 * Extract location from HTML
 */
function extractLocation(html) {
  // Look for pin/location icon followed by address
  // Pattern in Meetup: venue name on one line, address on another

  // Try to find venue block
  const venuePatterns = [
    // Location with street address
    /pin[^>]*>[\s\S]*?<[^>]*>([^<]+)<[\s\S]*?([^<]*\d+[^<]*)<[^>]*>[\s\S]*?·?\s*(\w+)/i,
    // Just venue name and city
    /<[^>]*class="[^"]*venue[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/i,
  ];

  // Try to extract from JSON-LD first
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      if (jsonLd.location) {
        const loc = jsonLd.location;
        if (typeof loc === 'string') return loc;

        const parts = [];
        if (loc.name) parts.push(loc.name);

        const addr = loc.address;
        if (addr) {
          if (typeof addr === 'string') {
            parts.push(addr);
          } else {
            if (addr.streetAddress) parts.push(addr.streetAddress);
            const cityParts = [addr.addressLocality, addr.addressRegion].filter(Boolean);
            if (cityParts.length) parts.push(cityParts.join(', '));
          }
        }

        if (parts.length) return parts.join('\n');
      }
    } catch (e) {
      // Failed to parse JSON-LD
    }
  }

  return null;
}

/**
 * Extract description from HTML
 */
function extractDescription(html) {
  // Try og:description
  const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogMatch) {
    return decodeHtmlEntities(ogMatch[1].trim());
  }

  // Try meta description
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (metaMatch) {
    return decodeHtmlEntities(metaMatch[1].trim());
  }

  return null;
}

/**
 * Extract image URL from HTML
 */
function extractImage(html) {
  // Try og:image
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogMatch) return ogMatch[1];

  // Try twitter:image
  const twitterMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
  if (twitterMatch) return twitterMatch[1];

  return null;
}

/**
 * Fetch and parse a Meetup event page
 */
async function fetchEventData(url) {
  console.log(`  Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract all data
    const title = extractTitle(html);
    const { date, time } = extractDateTime(html);
    const location = extractLocation(html);
    const description = extractDescription(html);
    const imageUrl = extractImage(html);

    // Get meetup ID from URL for unique slug
    const meetupId = url.match(/events\/(\d+)/)?.[1] || '';
    const slug = title ? `${slugify(title)}-${meetupId}` : `meetup-${meetupId}`;

    return {
      title,
      description,
      date,
      time,
      location,
      slug,
      image_url: imageUrl,
      meetup_url: url,
      meetup_id: meetupId,
    };

  } catch (error) {
    console.error(`  ❌ Failed to fetch ${url}:`, error.message);
    return null;
  }
}

/**
 * Add delay between requests
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🔍 Scraping Meetup events...\n');

  const events = [];

  for (let i = 0; i < MEETUP_URLS.length; i++) {
    const url = MEETUP_URLS[i];
    console.log(`[${i + 1}/${MEETUP_URLS.length}]`);

    const eventData = await fetchEventData(url);

    if (eventData) {
      events.push(eventData);
      console.log(`  ✅ ${eventData.title || 'Unknown event'}`);
      if (eventData.date) console.log(`     📅 ${eventData.date} at ${eventData.time}`);
      if (eventData.location) console.log(`     📍 ${eventData.location.split('\n')[0]}`);
      if (eventData.image_url) console.log('     🖼️  Has image');
    }

    // Be nice to Meetup servers
    if (i < MEETUP_URLS.length - 1) {
      await delay(2000);
    }
  }

  // Save to JSON file
  const outputPath = path.join(__dirname, 'meetup-events-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));

  console.log(`\n✅ Scraped ${events.length} events`);
  console.log(`📁 Data saved to: ${outputPath}`);
  console.log('\nNext step: Review the data and run the import script:');
  console.log('  node scripts/import-meetup-events.js --dry-run');
}

main().catch(console.error);
