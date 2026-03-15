/**
 * Format a price string for display.
 * - Just a number (e.g. "15", "15.50") → "€15,-", "€15,50"
 * - Number with currency only (e.g. "€15", "15 EUR", "15 euros") → unified as "€15,-"
 * - Extra text beyond currency/price (e.g. "€15 registration required") → return as-is
 * - No number (e.g. "Free", "Contact for price") → return as-is
 */
export function formatPrice(value: string | null | undefined): string | null {
  if (value == null) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const numMatch = trimmed.match(/[\d]+([.,][\d]+)?/);
  if (!numMatch) return trimmed;

  // If there's text beyond number + currency, show the whole string
  const withoutNum = trimmed.replace(/[\d]+([.,][\d]+)?/, '').trim();
  const withoutCurrency = withoutNum.replace(
    /^[€$£\s,-]+|[€$£\s,-]+$|\b(EUR|euros?|dollars?)\b/gi,
    '',
  ).trim();
  if (withoutCurrency.length > 0) return trimmed;

  const numStr = numMatch[0].replace(',', '.');
  const num = parseFloat(numStr);
  if (isNaN(num)) return trimmed;

  const formatted =
    num % 1 === 0 ? `${num},-` : num.toFixed(2).replace('.', ',');

  return `€${formatted}`;
}
