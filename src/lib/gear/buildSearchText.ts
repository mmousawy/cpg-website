export function buildGearSearchText(brand: string, name: string): string {
  return `${brand} ${name}`.trim().toLowerCase();
}
