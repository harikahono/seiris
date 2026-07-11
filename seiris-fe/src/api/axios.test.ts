import { describe, it, expect } from "vitest";

describe("api/axios", () => {
  it("exports an axios instance with get/post/put/delete", async () => {
    const api = (await import("@/api/axios")).default;
    expect(api).toBeDefined();
    expect(typeof api.get).toBe("function");
    expect(typeof api.post).toBe("function");
    expect(typeof api.put).toBe("function");
    expect(typeof api.delete).toBe("function");
  });

  it("baseURL ends with /api", async () => {
    const api = (await import("@/api/axios")).default;
    expect(api.defaults.baseURL).toMatch(/\/api$/);
  });
});
