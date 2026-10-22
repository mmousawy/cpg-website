import { userFacingMessageFromHttp, looksLikeHtmlErrorBody } from '@/utils/userFacingHttpError';

/**
 * Wrap fetch so Cloudflare / gateway HTML error pages become short JSON bodies
 * (Supabase clients surface them as error.message).
 */
export const supabaseFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (response.ok) return response;

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  const shouldInspect =
    contentType.includes('text/html')
    || response.status === 429
    || response.status === 502
    || response.status === 503
    || response.status === 504;

  if (!shouldInspect) return response;

  const text = await response.text();
  if (!looksLikeHtmlErrorBody(text)) {
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  const message = userFacingMessageFromHttp(
    response.status,
    text,
    'Database request failed. Please try again.',
  );

  return new Response(JSON.stringify({ message, error: message, msg: message }), {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
};

export const supabaseClientGlobalOptions = {
  global: { fetch: supabaseFetch },
};
