import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import api from "@/api/axios";
import type { DashboardTeamItem } from "@/types";

const STORAGE_KEY = "seiris_current_team_id";

interface TeamContextValue {
  currentTeamId: string | null;
  teams: DashboardTeamItem[];
  isLoading: boolean;
  setCurrentTeam: (id: string) => void;
  clearCurrentTeam: () => void;
  refreshTeams: () => void;
}

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [teams, setTeams] = useState<DashboardTeamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTeams = useCallback(() => {
    setIsLoading(true);
    api
      .get<{ message: string; data: { teams: DashboardTeamItem[] } }>("/my-dashboard")
      .then((res) => setTeams(res.data.data.teams))
      .catch(() => setTeams([]))
      .finally(() => setIsLoading(false));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refreshTeams(); }, [refreshTeams]);

  const setCurrentTeam = useCallback((id: string) => {
    setCurrentTeamId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const clearCurrentTeam = useCallback(() => {
    setCurrentTeamId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <TeamContext.Provider value={{ currentTeamId, teams, isLoading, setCurrentTeam, clearCurrentTeam, refreshTeams }}>
      {children}
    </TeamContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTeamContext() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeamContext must be used within TeamProvider");
  return ctx;
}
