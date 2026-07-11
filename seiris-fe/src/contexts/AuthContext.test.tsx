import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

vi.mock("@/api/axios", () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({ data: { user: null } }),
  },
}));

// Helper to read auth state from inside the provider
function AuthReader({ onState }: { onState: (a: unknown) => void }) {
  const auth = useAuth();
  useEffect(() => { onState(auth); }, [auth]);
  return null;
}

describe("AuthContext", () => {
  beforeEach(() => { localStorage.clear(); });

  it("login stores token in localStorage and sets user state", async () => {
    const axios = await import("@/api/axios");
    vi.mocked(axios.default.post).mockResolvedValue({
      data: { token: "tok123", user: { id: "1", name: "Alice", email: "a@b.c" } },
    });
    vi.mocked(axios.default.get).mockResolvedValue({
      data: { user: { id: "1", name: "Alice", email: "a@b.c" } },
    });

    const state: Record<string, unknown> = {};
    render(
      <AuthProvider>
        <AuthReader onState={(s) => Object.assign(state, s)} />
      </AuthProvider>,
    );

    await (state.login as (p: unknown) => Promise<void>)({ email: "a@b.c", password: "secret" });

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("tok123");
      expect(state.user).toMatchObject({ id: "1", name: "Alice", email: "a@b.c" });
    });
  });

  it("restores user from token on mount if token exists in localStorage", async () => {
    localStorage.setItem("token", "saved-token");
    const axios = await import("@/api/axios");
    vi.mocked(axios.default.get).mockResolvedValue({
      data: { user: { id: "1", name: "Bob", email: "b@b.c" } },
    });

    const state: Record<string, unknown> = {};
    render(
      <AuthProvider>
        <AuthReader onState={(s) => Object.assign(state, s)} />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(state.user).toMatchObject({ id: "1", name: "Bob", email: "b@b.c" });
    });
  });

  it("logout clears token from localStorage and sets user to null", async () => {
    localStorage.setItem("token", "tok123");
    const axios = await import("@/api/axios");
    vi.mocked(axios.default.get).mockResolvedValue({
      data: { user: { id: "1", name: "Alice", email: "a@b.c" } },
    });
    vi.mocked(axios.default.post).mockResolvedValue({ data: {} });

    const state: Record<string, unknown> = {};
    render(
      <AuthProvider>
        <AuthReader onState={(s) => Object.assign(state, s)} />
      </AuthProvider>,
    );

    await waitFor(() => { expect(state.user).toBeTruthy(); });

    await (state.logout as () => Promise<void>)();

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBeNull();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });
  });
});
