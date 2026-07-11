import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { TeamProvider, useTeamContext } from "@/contexts/TeamContext";

const mockTeams = vi.hoisted(() => [
  { id: "t1", name: "Team Alpha", role: "owner", my_equity_percentage: 25 },
  { id: "t2", name: "Team Beta", role: "member", my_equity_percentage: 10 },
]);

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: { data: { teams: mockTeams } },
    }),
  },
}));

function Reader({ onValue }: { onValue: (v: unknown) => void }) {
  const ctx = useTeamContext();
  useEffect(() => { onValue(ctx); }, [ctx]);
  return null;
}

describe("TeamContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads teams on mount via /my-dashboard", async () => {
    let value: unknown;
    render(
      <TeamProvider>
        <Reader onValue={(v) => { value = v; }} />
      </TeamProvider>,
    );
    await waitFor(() => {
      expect((value as { teams: unknown[] }).teams).toEqual(mockTeams);
    });
  });

  it("setCurrentTeam persists to localStorage", async () => {
    let value: unknown;
    render(
      <TeamProvider>
        <Reader onValue={(v) => { value = v; }} />
      </TeamProvider>,
    );
    await waitFor(() => expect((value as { teams: unknown[] }).teams).toHaveLength(2));

    (value as { setCurrentTeam: (id: string) => void }).setCurrentTeam("t1");
    expect(localStorage.getItem("seiris_current_team_id")).toBe("t1");
  });

  it("clearCurrentTeam removes from localStorage", async () => {
    localStorage.setItem("seiris_current_team_id", "t1");
    let value: unknown;
    render(
      <TeamProvider>
        <Reader onValue={(v) => { value = v; }} />
      </TeamProvider>,
    );
    await waitFor(() => expect((value as { teams: unknown[] }).teams).toHaveLength(2));

    (value as { clearCurrentTeam: () => void }).clearCurrentTeam();
    expect(localStorage.getItem("seiris_current_team_id")).toBeNull();
  });

  it("throws when useTeamContext used outside Provider", () => {
    expect(() => render(
      <Reader onValue={() => {}} />,
    )).toThrow("useTeamContext must be used within TeamProvider");
  });
});
