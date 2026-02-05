/**
 * UC (UserCoin) helpers.
 *
 * Balance/transaction amounts are stored as integer-like values in the backend.
 * Depending on column types, the client may receive them as strings.
 */

export function ucToBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0n;
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return 0n;
    const integerPart = s.includes(".") ? s.split(".")[0] : s;
    return BigInt(integerPart);
  }
  return 0n;
}

export function formatUC(value: unknown, locale?: string): string {
  const bi = ucToBigInt(value);
  try {
    return new Intl.NumberFormat(locale).format(bi);
  } catch {
    const s = bi.toString();
    const neg = s.startsWith("-");
    const digits = neg ? s.slice(1) : s;
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return neg ? `-${grouped}` : grouped;
  }
}

export function isValidUCInput(value: string): boolean {
  return /^\d+$/.test(value.trim());
}
