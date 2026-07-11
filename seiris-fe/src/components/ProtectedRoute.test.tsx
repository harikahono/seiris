import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

function Home() { return <p>Dashboard Home</p>; }

describe("ProtectedRoute", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("redirects to /login when unauthenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Home />} />
          </Route>
          <Route path="/login" element={<p>Login Page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Page")).toBeDefined();
  });

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, name: "Budi" }, isLoading: false });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Home />} />
          </Route>
          <Route path="/login" element={<p>Login Page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard Home")).toBeDefined();
  });

  it("shows loading when isLoading is true", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Home />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Memuat...")).toBeDefined();
  });
});
