import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import ContributionsTab from "@/components/teams/ContributionsTab";

// ── Mock sub-components & contexts ──
vi.mock("@/components/ui/ContributionCard", () => ({
  default: ({ contribution }: { contribution: { id: string } }) =>
    <div data-testid="contribution-card">{contribution.id}</div>,
}));

vi.mock("@/components/ui/EmptyState", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/components/ui/Skeleton", () => ({
  default: ({ className }: { className?: string }) => <div className={className}>skeleton</div>,
}));

vi.mock("@/components/ui/ContributionForm", () => ({
  default: () => null,
}));

vi.mock("@/components/ui/EquityPieCard", () => ({
  default: () => null,
}));

vi.mock("@/components/ui/ContributionTypeBar", () => ({
  default: () => null,
}));

vi.mock("@/components/ui/MemberEquityTable", () => ({
  default: () => null,
}));

vi.mock("@/components/ui/ExportPdfButton", () => ({
  default: () => null,
}));

vi.mock("@/components/ui/Pagination", () => ({
  default: () => null,
}));

const mockProjectCtx = vi.hoisted(() => ({
  currentProjectId: null as string | null,
  projects: [] as Array<{ id: string; is_frozen: boolean }>,
}));

vi.mock("@/contexts/ProjectContext", () => ({
  useProjectContext: () => mockProjectCtx,
}));

vi.mock("@/contexts/RealtimeContext", () => ({
  useRealtime: () => ({ refreshVersion: 0 }),
}));

// ── Mock API ──
const mockAxiosGet = vi.hoisted(() => vi.fn());
vi.mock("@/api/axios", () => ({
  default: { get: mockAxiosGet },
}));

const mockOutletCtx = { team: { id: "t1" }, fmr: 50000 };

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/teams/t1"]}>
      <Routes>
        <Route path="/teams/:teamId" element={<Outlet context={mockOutletCtx} />}>
          <Route path="" element={children} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("ContributionsTab", () => {
  it("renders contribution cards when data loads", async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.endsWith("/equity")) {
        return Promise.resolve({
          data: {
            data: {
              equity_map: [{ member_id: "m1", name: "Budi", slices: 400000, equity_pct: 100 }],
              total_slices: 400000,
              slices_by_type: { CASH: 400000 },
              is_frozen: false,
              calculated_at: null,
            },
          },
        });
      }
      // /teams/t1/contributions?page=1
      return Promise.resolve({
        data: {
          data: [{ id: "c1", type: "CASH", description: "Seed", status: "APPROVED", value: 100000, total_slices: 400000, contribution_date: "2026-07-10", member: { name: "Budi" } }],
          meta: { current_page: 1, last_page: 1, total: 1 },
        },
      });
    });

    render(<ContributionsTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("c1")).toBeDefined();
    });
  });

  it("shows empty state when no contributions", async () => {
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.endsWith("/equity")) {
        return Promise.resolve({
          data: {
            data: {
              equity_map: [],
              total_slices: 0,
              slices_by_type: { CASH: 0 },
              is_frozen: false,
              calculated_at: null,
            },
          },
        });
      }
      return Promise.resolve({
        data: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } },
      });
    });

    render(<ContributionsTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Belum ada kontribusi")).toBeDefined();
    });
  });

  it("locks contribution creation when current project is frozen", async () => {
    mockProjectCtx.currentProjectId = "p1";
    mockProjectCtx.projects = [{ id: "p1", is_frozen: true }];
    mockAxiosGet.mockImplementation((url: string) => {
      if (url.endsWith("/equity")) {
        return Promise.resolve({
          data: {
            data: {
              equity_map: [],
              total_slices: 0,
              slices_by_type: { CASH: 0 },
              is_frozen: false,
              calculated_at: null,
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } } });
    });

    render(<ContributionsTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Project ini sudah dikunci/i)).toBeDefined();
    });
    const kontribBtns = screen.getAllByRole("button", { name: /Kontribusi/i });
    expect(kontribBtns.some((b) => b.hasAttribute("disabled"))).toBe(true);
  });
});

afterEach(() => {
  mockProjectCtx.currentProjectId = null;
  mockProjectCtx.projects = [];
});
