import { describe, it, expect } from "vitest";
import { CONTRIBUTION_TYPES, STATUS_STYLES } from "@/lib/contribution";
import { cn } from "@/lib/utils";
import { parseErrors } from "@/lib/parseErrors";
import { formatRp, formatThousand } from "@/lib/constants";

describe("contribution lib", () => {
  it("exposes the 6 contribution types", () => {
    expect(CONTRIBUTION_TYPES).toHaveLength(6);
    expect(CONTRIBUTION_TYPES.map((t) => t.value)).toEqual([
      "TIME",
      "CASH",
      "IDEA",
      "NETWORK",
      "FACILITY",
      "SALES",
    ]);
  });

  it("maps statuses to style + label", () => {
    expect(STATUS_STYLES.PENDING.label).toBe("Pending");
    expect(STATUS_STYLES.APPROVED.text).toBe("text-green-400");
    expect(STATUS_STYLES.REJECTED.bg).toBe("bg-red-500/10");
  });
});

describe("utils.cn", () => {
  it("merges class lists", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("dedupes conflicting tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("parseErrors", () => {
  it("extracts first message per field from an axios error", () => {
    const err = {
      response: { data: { errors: { description: ["Deskripsi wajib diisi."] } } },
    };
    expect(parseErrors(err)).toEqual({ description: "Deskripsi wajib diisi." });
  });

  it("returns {} when there is no errors key", () => {
    expect(parseErrors({ response: { data: {} } })).toEqual({});
  });

  it("returns {} for non-object input", () => {
    expect(parseErrors(null)).toEqual({});
    expect(parseErrors("boom")).toEqual({});
  });
});

describe("constants.formatRp", () => {
  it("formats a value as Rupiah", () => {
    expect(formatRp(1000000)).toBe("Rp 1.000.000");
  });
});

describe("constants.formatThousand", () => {
  it("formats plain digits with thousand separators", () => {
    expect(formatThousand("150000")).toBe("150.000");
    expect(formatThousand("1000000")).toBe("1.000.000");
  });

  it("strips non-digit chars before formatting", () => {
    expect(formatThousand("1.000.000")).toBe("1.000.000");
    expect(formatThousand("Rp 500000")).toBe("500.000");
  });

  it("returns empty string for empty or non-numeric input", () => {
    expect(formatThousand("")).toBe("");
    expect(formatThousand("abc")).toBe("");
  });
});
