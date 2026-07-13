import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Outlet } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import ProjectSelector from "@/components/teams/ProjectSelector";
import type { Team } from "@/types";
import { ArrowLeft } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";

export interface TeamContext {
  team: Team;
  fetchTeam: (projectId?: string) => void;
  isOwner: boolean;
  currentUserId: string;
  currentMemberId: string;
  fmr: number;
}

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const [team, setTeam] = useState<Team | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTeam = useCallback((projectId?: string) => {
    if (!teamId) return;
    setError("");
    const params = projectId ? { project_id: projectId } : {};
    api
      .get<{ data: Team }>(`/teams/${teamId}`, { params })
      .then((res) => setTeam(res.data.data))
      .catch((err) => {
        if (err.response?.status === 403) {
          setError("Kamu bukan anggota tim ini.");
        } else {
          setError("Gagal memuat data tim.");
        }
      })
      .finally(() => setInitialLoading(false));
  }, [teamId]);

  useEffect(() => { fetchTeam(currentProjectId ?? undefined); }, [fetchTeam, currentProjectId]);

  if (initialLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 px-6 pt-10 pb-8">
        {/* Team header */}
        <div className="space-y-3">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <div className="h-px bg-gray-800/50" />
        </div>
        {/* Tab content skeleton */}
        <div className="animate-pulse space-y-4">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-md" />)}
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-8">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-white transition"
        >
          <ArrowLeft className="size-4" />
          Kembali
        </button>
        <div className="rounded-xl border border-gray-800 bg-card p-8 text-center">
          <p className="text-red-400">{error || "Tim tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isOwner = user.id === team.owner.id;
  const currentMember = team.members.find((m) => m.user.id === user.id);
  const currentMemberId = currentMember?.id ?? "";
  const fmr = currentMember?.fmr ?? 0;

  const context: TeamContext = {
    team,
    fetchTeam,
    isOwner,
    currentUserId: user.id,
    currentMemberId,
    fmr,
  };

  return (
    <div className="mx-auto max-w-7xl px-6 pt-10 pb-8">
      {/* ── Team Header ── */}
      <div className="animate-fade-in-up mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">{team.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {team.description || "Tidak ada deskripsi."}
        </p>
        <div className="mt-4 h-px bg-gradient-to-r from-gray-800 to-transparent" />
      </div>

      {/* ── Project Scope Selector (Slicing Pie Beranak) ── */}
      <ProjectSelector />
      {/* ── Tab Content ── */}
      <Outlet context={context} />
    </div>
  );
}
