import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import api from "@/api/axios";
import { useAuth } from "./AuthContext";
import type { DashboardTeamItem } from "@/types";
import { toast } from "sonner";

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

  const { user } = useAuth();

  const refreshTeams = useCallback(() => {
    setIsLoading(true);
    api
      .get<{ message: string; data: { teams: DashboardTeamItem[] } }>("/my-dashboard")
      .then((res) => setTeams(res.data.data.teams))
      .catch(() => { setTeams([]); toast.error("Gagal memuat data tim"); })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    refreshTeams();
  }, [refreshTeams, user]);

  // H-H: clear teams on logout signal from AuthContext
  useEffect(() => {
    let lastVersion = localStorage.getItem('seiris_teams_version') ?? '';
    const id = setInterval(() => {
      const current = localStorage.getItem('seiris_teams_version') ?? '';
      if (current !== lastVersion) {
        lastVersion = current;
        setTeams([]);
        setCurrentTeamId(null);
        localStorage.removeItem('seiris_teams_version');
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

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