/**
 * Copy-paste scraper User-Agents.
 *
 * DeviceAtlas (and gists cloned from it) publish a fixed set of 2016–2017
 * device examples. Scrapers rotate that list and swap the Chrome version
 * (the 2026-08-28 crawl used SM-G892A + NRD90M + Chrome/109 instead of
 * the original Chrome/60). Match model + build, not a full UA string.
 *
 * @see https://deviceatlas.com/blog/list-of-user-agent-strings
 * @see https://gist.github.com/cenyG/619721e0cb06820dc233d154b4416fca
 */

export type ScraperUaFingerprint = {
  id: string
  /** Every token must appear in the UA (case-insensitive). */
  tokens: readonly string[]
  note: string
};

export const scraperUaFingerprints: readonly ScraperUaFingerprint[] = [
  {
    id: 'galaxy-s8-active-nrd90m',
    tokens: ['sm-g892a', 'nrd90m'],
    note: 'Galaxy S8 Active. Observed 2026-08-28 with Chrome/109 grafted on.',
  },
  {
    id: 'galaxy-s7-verizon-nrd90m',
    tokens: ['sm-g930vc', 'nrd90m'],
    note: 'Galaxy S7 Verizon WebView example from the same DeviceAtlas list.',
  },
  {
    id: 'galaxy-s7-edge-mmb29k',
    tokens: ['sm-g935s', 'mmb29k'],
    note: 'Galaxy S7 Edge example from the same DeviceAtlas list.',
  },
  {
    id: 'galaxy-s6-verizon-mmb29k',
    tokens: ['sm-g920v', 'mmb29k'],
    note: 'Galaxy S6 Verizon example from the same DeviceAtlas list.',
  },
  {
    id: 'galaxy-s6-edge-plus-lmy47x',
    tokens: ['sm-g928x', 'lmy47x'],
    note: 'Galaxy S6 Edge+ example from the same DeviceAtlas list.',
  },
  {
    id: 'nexus-6p-mmb29p',
    tokens: ['nexus 6p', 'mmb29p'],
    note: 'Nexus 6P example from the same DeviceAtlas list.',
  },
  {
    id: 'xperia-xzs-g8231',
    tokens: ['g8231', '41.2.a.0.219'],
    note: 'Sony Xperia XZs example from the same DeviceAtlas list.',
  },
  {
    id: 'xperia-z5-e6653',
    tokens: ['e6653', '32.2.a.0.253'],
    note: 'Sony Xperia Z5 example from the same DeviceAtlas list.',
  },
  {
    id: 'htc-one-x10-mra58k',
    tokens: ['htc one x10', 'mra58k'],
    note: 'HTC One X10 example from the same DeviceAtlas list.',
  },
  {
    id: 'htc-one-m9-mra58k',
    tokens: ['htc one m9', 'mra58k'],
    note: 'HTC One M9 example from the same DeviceAtlas list.',
  },
  {
    id: 'pixel-c-nrd90m',
    tokens: ['pixel c', 'nrd90m'],
    note: 'Pixel C tablet example from the same DeviceAtlas list.',
  },
  {
    id: 'xperia-z4-tablet-sgp771',
    tokens: ['sgp771', '32.2.a.0.253'],
    note: 'Xperia Z4 Tablet example from the same DeviceAtlas list.',
  },
  {
    id: 'shield-tablet-k1-mra58k',
    tokens: ['shield tablet k1', 'mra58k'],
    note: 'NVIDIA SHIELD Tablet K1 example from the same DeviceAtlas list.',
  },
  {
    id: 'galaxy-tab-s3-nrd90m',
    tokens: ['sm-t827r4', 'nrd90m'],
    note: 'Galaxy Tab S3 example from the same DeviceAtlas list.',
  },
  {
    id: 'galaxy-tab-a-lrx22g',
    tokens: ['sm-t550', 'lrx22g'],
    note: 'Galaxy Tab A example from the same DeviceAtlas list.',
  },
  {
    id: 'kindle-fire-hd-kfthwi',
    tokens: ['kfthwi', 'ktu84m'],
    note: 'Kindle Fire HD example from the same DeviceAtlas list.',
  },
  {
    id: 'lg-g-pad-v410-lrx22g',
    tokens: ['lg-v410', 'lrx22g'],
    note: 'LG G Pad 8.0 example from the same DeviceAtlas list.',
  },
  {
    id: 'lumia-950',
    tokens: ['lumia 950'],
    note: 'Windows Phone is discontinued; this string is a DeviceAtlas example.',
  },
  {
    id: 'windows-phone-rm-1152',
    tokens: ['windows phone', 'rm-1152'],
    note: 'Windows Phone Lumia example from the same DeviceAtlas list.',
  },
  {
    id: 'windows-phone-rm-1127',
    tokens: ['windows phone', 'rm-1127'],
    note: 'Windows Phone Lumia example from the same DeviceAtlas list.',
  },
  {
    id: 'iphone9-3-ios10-example',
    tokens: ['iphone9,3', 'os 10_0_1'],
    note: 'Synthetic DeviceAtlas iPhone UA (real Safari UAs do not use iPhone9,3 this way).',
  },
  {
    id: 'iphone9-4-ios10-example',
    tokens: ['iphone9,4', 'os 10_0_1'],
    note: 'Synthetic DeviceAtlas iPhone UA from the same copy-paste list.',
  },
  {
    id: 'apple-iphone7c2',
    tokens: ['apple-iphone7c2'],
    note: 'Carrier/profile UA from the same copy-paste list, not a current browser.',
  },
];

/**
 * Default HTTP-client User-Agents. These are not browsers.
 * Do not include okhttp or Dalvik — real Android apps send those.
 */
export const scraperHttpClientSnippets: readonly string[] = [
  'python-requests',
  'python-urllib',
  'aiohttp',
  'python-httpx',
  'httpx/',
  'go-http-client',
  'curl/',
  'wget/',
  'libwww-perl',
  'httpunit',
  'java/',
  'apache-httpclient',
  'node-fetch',
  'undici',
  'postmanruntime',
  'insomnia/',
  'axios/',
];

/**
 * Honest crawlers: skip view counts, but do not 403 (they should still index).
 */
export const crawlerUaSnippets: readonly string[] = [
  'bot',
  'crawl',
  'spider',
  'slurp',
  'mediapartners',
  'googlebot',
  'bingbot',
  'yandex',
  'baidu',
  'duckduck',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'embedly',
  'quora',
  'pinterest',
  'redditbot',
  'slackbot',
  'whatsapp',
  'telegram',
  'discordbot',
  'applebot',
  'msnbot',
  'ia_archiver',
  'headless',
];
