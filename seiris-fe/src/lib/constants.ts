/** Locale untuk formatting angka/tanggal */
export const LOCALE = "id-ID";

/** Format Rupiah: Rp 1.000.000 */
export function formatRp(value: number): string {
  return `Rp ${Math.round(value).toLocaleString(LOCALE)}`;
}

/** Format angka dengan thousand separator id-ID: 150000 → "150.000" */
export function formatThousand(value: string): string {
  const raw = value.replace(/\D/g, "");
  if (!raw) return "";
  return Number(raw).toLocaleString(LOCALE);
}

/**
 * Base URL API backend.
 * Fallback localhost untuk dev; di VPS wajib set VITE_API_BASE_URL.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
