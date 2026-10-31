import { isSafeFetchUrl } from '@/utils/safeFetchUrl';

const USER_AGENT = 'Mozilla/5.0 (compatible; CPG-ProfileLinkCheck/1.0)';
const MAX_HTML_BYTES = 120_000;

export async function fetchPageHtml(url: string): Promise<
  | { ok: true; html: string; finalUrl: string }
  | { ok: false; reason: 'unsafe_url' | 'fetch_failed' | 'http_error'; detail?: string }
> {
  if (!(await isSafeFetchUrl(url))) {
    return { ok: false, reason: 'unsafe_url' };
  }

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return { ok: false, reason: 'http_error', detail: String(response.status) };
    }

    const buffer = await response.arrayBuffer();
    const slice = buffer.byteLength > MAX_HTML_BYTES
      ? buffer.slice(0, MAX_HTML_BYTES)
      : buffer;
    const html = new TextDecoder('utf-8', { fatal: false }).decode(slice);
    return { ok: true, html, finalUrl: response.url };
  } catch (err) {
    return {
      ok: false,
      reason: 'fetch_failed',
      detail: err instanceof Error ? err.message : undefined,
    };
  }
}
