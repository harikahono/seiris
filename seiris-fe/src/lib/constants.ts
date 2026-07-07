/** Locale untuk formatting angka/tanggal */
export const LOCALE = "id-ID";

/** Format Rupiah: Rp 1.000.000 */
export function formatRp(value: number): string {
  return `Rp ${Math.round(value).toLocaleString(LOCALE)}`;
}
