import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import api from "@/api/axios";
import { useRealtime } from "@/contexts/RealtimeContext";

const STORAGE_PREFIX = "seiris_current_project_id_"; // per-team

export interface ProjectItem {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  is_frozen: boolean;
  frozen_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectContextValue {
  currentTeamId: string | null;
  projects: ProjectItem[];
  currentProjectId: string | null; // null = scope tim (induk)
  isLoading: boolean;
  setCurrentProject: (id: string | null) => void;
  clearCurrentProject: () => void;
  refreshProjects: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ teamId, children }: { teamId: string | null; children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const storageKey = teamId ? STORAGE_PREFIX + teamId : null;
  const { refreshVersion } = useRealtime();

  const refreshProjects = useCallback(() => {
    if (!teamId) {
      setProjects([]);
      return;
    }
    setIsLoading(true);
    api
      .get<{ message: string; data: ProjectItem[] }>(`/teams/${teamId}/projects`)
      .then((res) => {
        setProjects(res.data.data);
        // restore selection dari localStorage kalau masih valid
        const saved = storageKey ? localStorage.getItem(storageKey) : null;
        if (saved && res.data.data.some((p) => p.id === saved)) {
          setCurrentProjectId(saved);
        } else {
          setCurrentProjectId(null);
        }
      })
      .catch(() => { setProjects([]); })
      .finally(() => setIsLoading(false));
  }, [teamId, storageKey]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Realtime: proyek baru / freeze dari anggota lain → sync list otomatis.
  useEffect(() => {
    if (refreshVersion > 0) refreshProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  const setCurrentProject = useCallback((id: string | null) => {
    setCurrentProjectId(id);
    if (storageKey) {
      if (id) localStorage.setItem(storageKey, id);
      else localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const clearCurrentProject = useCallback(() => {
    setCurrentProjectId(null);
    if (storageKey) localStorage.removeItem(storageKey);
  }, [storageKey]);

  return (
    <ProjectContext.Provider value={{ currentTeamId: teamId, projects, currentProjectId, isLoading, setCurrentProject, clearCurrentProject, refreshProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProjectContext() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjectContext must be used within ProjectProvider");
  return ctx;
}
