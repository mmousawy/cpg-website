import { describe, expect, it } from 'vitest';

import {
  errorMessageFromFetchResponse,
  looksLikeHtmlErrorBody,
  sanitizeErrorMessage,
  userFacingMessageFromHttp,
} from '@/utils/userFacingHttpError';

const CF_502 = `<!DOCTYPE html><html><head><title>db.example | 502: Bad gateway</title></head>
<body><div id="cf-wrapper">Bad gateway</div></body></html>`;

describe('userFacingHttpError', () => {
  it('detects Cloudflare HTML bodies', () => {
    expect(looksLikeHtmlErrorBody(CF_502)).toBe(true);
    expect(looksLikeHtmlErrorBody('{"message":"ok"}')).toBe(false);
  });

  it('maps 502 HTML to a short message', () => {
    const msg = userFacingMessageFromHttp(502, CF_502);
    expect(msg).toContain('unavailable');
    expect(msg).not.toContain('<!DOCTYPE');
  });

  it('sanitizes HTML stuffed into error.message', () => {
    expect(sanitizeErrorMessage(CF_502)).not.toContain('html');
  });

  it('parses JSON API errors and still sanitizes nested HTML', async () => {
    const res = new Response(JSON.stringify({ message: CF_502 }), { status: 500 });
    const msg = await errorMessageFromFetchResponse(res, 'Failed');
    expect(msg).not.toContain('<!DOCTYPE');
  });

  it('maps 429 without HTML', () => {
    expect(userFacingMessageFromHttp(429, '')).toMatch(/too many requests/i);
  });
});
