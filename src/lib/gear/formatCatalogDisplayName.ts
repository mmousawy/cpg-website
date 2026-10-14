function brandAlreadyInName(brand: string, name: string): boolean {
  const b = brand.trim().toLowerCase();
  const n = name.trim().toLowerCase();
  if (!b) return true;
  if (n.startsWith(b)) return true;
  const firstToken = b.split(/\s+/)[0];
  return firstToken.length >= 2 && n.startsWith(firstToken);
}

/** Join brand + catalog name for display/search when the name omits the brand. */
export function formatCatalogDisplayName(brand: string, name: string): string {
  const trimmedName = name.trim();
  const trimmedBrand = brand.trim();
  if (!trimmedBrand || brandAlreadyInName(trimmedBrand, trimmedName)) {
    return trimmedName;
  }
  return `${trimmedBrand} ${trimmedName}`;
}
