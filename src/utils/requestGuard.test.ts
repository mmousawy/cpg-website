import { describe, expect, it } from 'vitest';

import {
  isBlockedIp,
  isBotUserAgent,
  isKnownScraperUserAgent,
  parseFingerprintList,
  parseIpList,
  shouldBlockClient,
} from '@/utils/requestGuard';

const SCRAPER_UA_CHROME_109 =
  'Mozilla/5.0 (Linux; Android 7.0; SM-G892A Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.0.0 Mobile Safari/537.36';

const SCRAPER_UA_CHROME_60 =
  'Mozilla/5.0 (Linux; Android 7.0; SM-G892A Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/60.0.3112.107 Mobile Safari/537.36';

const PIXEL_C_UA =
  'Mozilla/5.0 (Linux; Android 7.0; Pixel C Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/52.0.2743.98 Safari/537.36';

describe('parseIpList', () => {
  it('splits comma-separated IPs', () => {
    expect(parseIpList(' 1.1.1.1, 2.2.2.2 ')).toEqual(['1.1.1.1', '2.2.2.2']);
    expect(parseIpList(undefined)).toEqual([]);
  });
});

describe('parseFingerprintList', () => {
  it('parses token groups from env', () => {
    expect(parseFingerprintList('sm-g999+foo, Pixel C+nrd90m ')).toEqual([
      ['sm-g999', 'foo'],
      ['pixel c', 'nrd90m'],
    ]);
  });
});

describe('isBlockedIp', () => {
  it('blocks the known Dutch scraper IP', () => {
    expect(isBlockedIp('92.254.97.120')).toBe(true);
    expect(isBlockedIp('1.1.1.1')).toBe(false);
    expect(isBlockedIp('1.1.1.1', ['1.1.1.1'])).toBe(true);
    expect(isBlockedIp(null)).toBe(false);
  });
});

describe('isKnownScraperUserAgent', () => {
  it('matches DeviceAtlas copy-paste fingerprints even when Chrome is swapped', () => {
    expect(isKnownScraperUserAgent(SCRAPER_UA_CHROME_109)).toBe(true);
    expect(isKnownScraperUserAgent(SCRAPER_UA_CHROME_60)).toBe(true);
    expect(isKnownScraperUserAgent(PIXEL_C_UA)).toBe(true);
    expect(isKnownScraperUserAgent(
      'Mozilla/5.0 (Linux; Android 7.0; SM-G930VC Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/58.0.3029.83 Mobile Safari/537.36',
    )).toBe(true);
    expect(isKnownScraperUserAgent(
      'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/13.1058',
    )).toBe(true);
  });

  it('matches HTTP client defaults and the Node http UA', () => {
    expect(isKnownScraperUserAgent('python-requests/2.32.3')).toBe(true);
    expect(isKnownScraperUserAgent('Go-http-client/2.0')).toBe(true);
    expect(isKnownScraperUserAgent('node')).toBe(true);
  });

  it('does not match current browsers or honest crawlers', () => {
    expect(isKnownScraperUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
    )).toBe(false);
    expect(isKnownScraperUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    )).toBe(false);
    expect(isKnownScraperUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(false);
  });
});

describe('isBotUserAgent', () => {
  it('treats empty, named bots, and scraper UAs as bots', () => {
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent('')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBotUserAgent(SCRAPER_UA_CHROME_109)).toBe(true);
    expect(isBotUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    )).toBe(false);
  });
});

describe('shouldBlockClient', () => {
  it('blocks on IP or scraper UA, not on Googlebot', () => {
    expect(shouldBlockClient('92.254.97.120', 'Mozilla/5.0')).toBe(true);
    expect(shouldBlockClient('8.8.8.8', SCRAPER_UA_CHROME_109)).toBe(true);
    expect(shouldBlockClient('8.8.8.8', 'Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(false);
    expect(shouldBlockClient('8.8.8.8', 'Mozilla/5.0 Chrome/128')).toBe(false);
  });
});
