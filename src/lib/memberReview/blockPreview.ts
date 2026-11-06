import type { NextResponse } from 'next/server';

export const BLOCK_PREVIEW_QUERY_PARAM = 'preview-block';
export const BLOCK_PREVIEW_COOKIE_NAME = 'cpg_block_preview';
export const REVIEW_PREVIEW_QUERY_PARAM = 'preview-review';
export const REVIEW_PREVIEW_COOKIE_NAME = 'cpg_review_preview';
export const PREVIEW_FLAG_COOKIE_VALUE = '1';

const ENABLE_VALUES = new Set(['true', '1', 'on', 'yes']);
const DISABLE_VALUES = new Set(['false', '0', 'off', 'no']);

export type PreviewFlagAction = 'enable' | 'disable';

export function parsePreviewFlagQuery(value: string | null | undefined): PreviewFlagAction | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (ENABLE_VALUES.has(normalized)) return 'enable';
  if (DISABLE_VALUES.has(normalized)) return 'disable';
  return null;
}

/** @deprecated Use parsePreviewFlagQuery */
export const parseBlockPreviewQuery = parsePreviewFlagQuery;

function cookieOptions(maxAge: number, httpOnly: boolean) {
  return {
    httpOnly,
    path: '/' as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  };
}

function setPreviewFlagCookie(
  response: NextResponse,
  cookieName: string,
  action: PreviewFlagAction,
  httpOnly: boolean,
): void {
  if (action === 'enable') {
    response.cookies.set(cookieName, PREVIEW_FLAG_COOKIE_VALUE, cookieOptions(60 * 60 * 24, httpOnly));
    return;
  }
  response.cookies.set(cookieName, '', cookieOptions(0, httpOnly));
}

export function applyBlockPreviewCookie(response: NextResponse, action: PreviewFlagAction): void {
  setPreviewFlagCookie(response, BLOCK_PREVIEW_COOKIE_NAME, action, true);
  if (action === 'enable') {
    setPreviewFlagCookie(response, REVIEW_PREVIEW_COOKIE_NAME, 'disable', false);
  }
}

export function applyReviewPreviewCookie(response: NextResponse, action: PreviewFlagAction): void {
  setPreviewFlagCookie(response, REVIEW_PREVIEW_COOKIE_NAME, action, false);
  if (action === 'enable') {
    setPreviewFlagCookie(response, BLOCK_PREVIEW_COOKIE_NAME, 'disable', true);
  }
}

export function hasReviewPreviewCookie(cookieHeader: string | undefined | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(';').some((part) => {
    const [name, value] = part.trim().split('=');
    return name === REVIEW_PREVIEW_COOKIE_NAME && value === PREVIEW_FLAG_COOKIE_VALUE;
  });
}

export function isPreviewFlagCookieSet(value: string | undefined | null): boolean {
  return value === PREVIEW_FLAG_COOKIE_VALUE;
}

export const isBlockPreviewCookieSet = isPreviewFlagCookieSet;
