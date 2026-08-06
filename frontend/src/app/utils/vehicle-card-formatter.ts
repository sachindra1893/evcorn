/**
 * Vehicle Summary Card Formatter (Phase A UI Standards)
 * Enforces standardized range & battery displays across all vehicle summary cards:
 * - Range: "650 km" (numeric + " km" only, strips MIDC, WLTP, NEDC, EPA, CLTC, parentheses)
 * - Battery: "82.56 kWh" (numeric + " kWh" only, strips chemistry, Blade Battery, Ultium, etc.)
 */

export function formatCardRange(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return 'N/A';
  const str = String(val).trim();
  if (!str || str === 'N/A' || str === 'na' || str === '-') return 'N/A';

  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (!match) return str;

  return `${match[1]} km`;
}

export function formatCardBattery(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return 'N/A';
  const str = String(val).trim();
  if (!str || str === 'N/A' || str === 'na' || str === '-') return 'N/A';

  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (!match) return str;

  return `${match[1]} kWh`;
}
