import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet, type ReactNode } from "react-router-dom";
import TeamMembersTab from "@/components/teams/TeamMembersTab";

const mockAxios = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue({ data: { data: [] } }),
  post: vi.fn().mockResolvedValue({ data: {} }),
  delete: vi.fn().mockResolvedValue({ data: {} }),
}));

vi.mock("@/api/axios", () => ({ default: mockAxios }));

vi.mock("@/contexts/RealtimeContext", () => ({
  useRealtime: () => ({ refreshVersion: 0 }),
}));

vi.mock("@/components/teams/ProjectSelector", () => ({
  default: () => null,
}));

const mockProjectCtx = vi.hoisted(() => ({
  currentProjectId: null as string | null,
  projects: [] as Array<{ id: string; is_frozen: boolean }>,
}));

vi.mock("@/contexts/ProjectContext", () => ({
  useProjectContext: () => mockProjectCtx,
}));

const teamContext = {
  team: {
    id: "t1",
    owner: { id: "u-owner" },
    members: [
      { id: "m-owner", user: { id: "u-owner", name: "Owner", email: "o@x.com" }, role: "owner", status: "active", fmr: 50000, project_fmr: null },
      { id: "m-other", user: { id: "u-other", name: "Budi", email: "b@x.com" }, role: "member", status: "active", fmr: 50000, project_fmr: null },
    ],
  },
  fetchTeam: vi.fn(),
  isOwner: true,
  currentUserId: "u-owner",
  currentMemberId: "m-owner",
  fmr: 50000,
};

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/teams/t1"]}>
      <Routes>
        <Route path="/teams/:teamId" element={<Outlet context={teamContext} />}>
          <Route path="" element={children} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("TeamMembersTab (project frozen)", () => {
  beforeEach(() => {
    mockProjectCtx.currentProjectId = "p1";
    mockProjectCtx.projects = [{ id: "p1", is_frozen: true }];
    mockAxios.get.mockResolvedValue({ data: { data: [] } });
  });

  it("locks member add/remove and FMR edit when current project is frozen", async () => {
    render(<TeamMembersTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Dikunci/i)).toBeDefined();
    });

    // Add/remove buttons must be gone, replaced by the lock label
    expect(screen.queryByText("Masuk")).toBeNull();
    expect(screen.queryByText("Keluar")).toBeNull();
  });
});
