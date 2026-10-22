const HTML_ERROR_SNIPPETS = [
  '<!doctype html',
  '<html',
  'cf-error-details',
  'cf-wrapper',
  'cloudflare',
];

export function looksLikeHtmlErrorBody(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower) return false;
  return HTML_ERROR_SNIPPETS.some((snippet) => lower.includes(snippet));
}

function cloudflareTitleHint(text: string): string | null {
  const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!titleMatch) return null;
  const title = titleMatch[1].toLowerCase();
  if (title.includes('rate limit') || title.includes('too many requests') || title.includes('429')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (title.includes('bad gateway') || title.includes('502')) {
    return 'The server is temporarily unavailable. Please try again in a few minutes.';
  }
  if (title.includes('service unavailable') || title.includes('503')) {
    return 'The server is temporarily unavailable. Please try again shortly.';
  }
  if (title.includes('gateway time-out') || title.includes('504')) {
    return 'The server took too long to respond. Please try again.';
  }
  if (title.includes('access denied') || title.includes('blocked')) {
    return 'Request was blocked. Please wait and try again.';
  }
  return null;
}

/**
 * Turn raw HTTP status + body into a short message safe to show in the UI.
 */
export function userFacingMessageFromHttp(
  status: number,
  bodyText: string,
  fallback = 'Something went wrong. Please try again.',
): string {
  const trimmed = bodyText.trim();
  const fromHtml = looksLikeHtmlErrorBody(trimmed) ? cloudflareTitleHint(trimmed) : null;
  if (fromHtml) return fromHtml;

  if (looksLikeHtmlErrorBody(trimmed)) {
    if (status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (status === 502) return 'The server is temporarily unavailable. Please try again in a few minutes.';
    if (status === 503) return 'The server is temporarily unavailable. Please try again shortly.';
    if (status === 504) return 'The server took too long to respond. Please try again.';
    if (status === 403) return 'Request was blocked. Please wait and try again.';
    return 'Connection problem. Please try again in a few minutes.';
  }

  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status === 502 || status === 503 || status === 504) {
    return 'The server is temporarily unavailable. Please try again in a few minutes.';
  }

  if (trimmed && !looksLikeHtmlErrorBody(trimmed) && trimmed.length <= 500) {
    return trimmed;
  }

  return fallback;
}

/** Strip HTML / gateway noise from an error message (e.g. Supabase client). */
export function sanitizeErrorMessage(message: string, status?: number): string {
  const trimmed = message.trim();
  if (!trimmed) return 'Something went wrong. Please try again.';
  if (looksLikeHtmlErrorBody(trimmed)) {
    return userFacingMessageFromHttp(status ?? 0, trimmed);
  }
  if (trimmed.length > 500) {
    return 'Something went wrong. Please try again.';
  }
  return trimmed;
}

export function toUserFacingError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message) || fallback;
  }
  if (typeof error === 'string') {
    return sanitizeErrorMessage(error) || fallback;
  }
  return fallback;
}

export async function errorMessageFromFetchResponse(
  response: Response,
  fallback = 'Request failed',
): Promise<string> {
  const text = await response.text().catch(() => '');
  if (!text) {
    return userFacingMessageFromHttp(response.status, '', fallback);
  }

  try {
    const json = JSON.parse(text) as { message?: string; error?: string };
    const fromJson = json.message || json.error;
    if (fromJson && typeof fromJson === 'string') {
      return sanitizeErrorMessage(fromJson, response.status);
    }
  } catch {
    // not JSON
  }

  return userFacingMessageFromHttp(response.status, text, fallback);
}
