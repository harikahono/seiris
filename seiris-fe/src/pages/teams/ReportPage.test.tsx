import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPie, fetchAllPages } from "@/pages/teams/reportUtils";

vi.mock("@/api/axios", () => ({ default: { get: vi.fn() } }));
import api from "@/api/axios";

describe("buildPie", () => {
  it("membuat 2 slice 50/50 dari 2 member dengan pct & geometri benar", () => {
    const slices = buildPie([{ slices: 5 }, { slices: 5 }], 10, 100, 100, 92);
    expect(slices).toHaveLength(2);
    // setengah lingkaran: start -90° → end 90°
    expect(slices[0].pct).toBeCloseTo(0.5);
    expect(slices[0].largeArc).toBe(0);
    expect(slices[0].x1).toBeCloseTo(100);
    expect(slices[0].y1).toBeCloseTo(8);
    expect(slices[0].x2).toBeCloseTo(100);
    expect(slices[0].y2).toBeCloseTo(192);
    // slice kedua lanjut dari 90° → 270°
    expect(slices[1].pct).toBeCloseTo(0.5);
    expect(slices[1].x1).toBeCloseTo(100);
    expect(slices[1].y1).toBeCloseTo(192);
    expect(slices[1].x2).toBeCloseTo(100);
    expect(slices[1].y2).toBeCloseTo(8);
    expect(slices.reduce((s, p) => s + p.pct, 0)).toBeCloseTo(1);
  });

  it("1 member 100% → 1 slice dengan label", () => {
    const slices = buildPie([{ slices: 7 }], 7, 100, 100, 92);
    expect(slices).toHaveLength(1);
    expect(slices[0].pct).toBe(1);
    expect(slices[0].label).toBe(true);
  });

  it("totalSlices 0 (tim baru) → pct 0, tanpa label", () => {
    const slices = buildPie([{ slices: 0 }, { slices: 0 }], 0, 100, 100, 92);
    expect(slices.every((p) => p.pct === 0 && !p.label)).toBe(true);
  });
});

describe("fetchAllPages", () => {
  beforeEach(() => vi.mocked(api.get).mockReset());

  it("loop semua halaman sampai last_page, gabungkan semua item", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: { data: ["a", "b"], meta: { current_page: 1, last_page: 2, total: 2 } },
      })
      .mockResolvedValueOnce({
        data: { data: ["c"], meta: { current_page: 2, last_page: 2, total: 3 } },
      });

    const items = await fetchAllPages<string>("/x", { per_page: 2 });
    expect(items).toEqual(["a", "b", "c"]);
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenNthCalledWith(1, "/x", { params: { page: 1, per_page: 2 } });
    expect(api.get).toHaveBeenNthCalledWith(2, "/x", { params: { page: 2, per_page: 2 } });
  });
});