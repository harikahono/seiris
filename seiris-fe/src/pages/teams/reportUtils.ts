import api from "@/api/axios";

export const PALETTE = [
  "#e07820", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#ec4899", "#14b8a6", "#f43f5e", "#6366f1", "#84cc16",
  "#d946ef", "#06b6d4", "#f97316", "#a855f7", "#22c55e",
];

interface PageMeta {
  current_page: number;
  last_page: number;
  total: number;
}

/* Ponytail: report butuh SEMUA data, bukan 1 halaman. Loop semua halaman. */
export async function fetchAllPages<T>(url: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let lastPage = 1;
  while (page <= lastPage) {
    const res = await api.get<{ data: T[]; meta: PageMeta }>(url, {
      params: { page, ...params },
    });
    items.push(...res.data.data);
    lastPage = res.data.meta.last_page;
    page += 1;
  }
  return items;
}

/* ── Pie chart geometry (dipindah dari blade lama, render di browser = mulus) ── */
export interface PieSlice {
  color: string;
  x1: number; y1: number; x2: number; y2: number;
  largeArc: 0 | 1;
  lx: number; ly: number;
  pct: number;
  label: boolean;
}

export function buildPie(
  members: { slices: number }[],
  totalSlices: number,
  cx: number,
  cy: number,
  r: number
): PieSlice[] {
  const rad = (d: number) => (d * Math.PI) / 180;
  let start = -90;
  return members.map((m, i) => {
    const pct = totalSlices > 0 ? m.slices / totalSlices : 0;
    const sweep = pct * 360;
    const end = start + sweep;
    const x1 = cx + r * Math.cos(rad(start));
    const y1 = cy + r * Math.sin(rad(start));
    const x2 = cx + r * Math.cos(rad(end));
    const y2 = cy + r * Math.sin(rad(end));
    const mid = start + sweep / 2;
    start = end;
    return {
      color: PALETTE[i % PALETTE.length],
      x1, y1, x2, y2,
      largeArc: sweep > 180 ? 1 : 0,
      lx: cx + r * 0.62 * Math.cos(rad(mid)),
      ly: cy + r * 0.62 * Math.sin(rad(mid)),
      pct,
      label: pct > 0.06,
    };
  });
}