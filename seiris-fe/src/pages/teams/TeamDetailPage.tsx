import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Outlet } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import type { Team } from "@/types";
import { ArrowLeft } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";

export interface TeamContext {
  team: Team;
  fetchTeam: () => void;
  isOwner: boolean;
  currentUserId: string;
  currentMemberId: string;
  fmr: number;
}

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTeam = useCallback(() => {
    if (!teamId) return;
    setLoading(true);
    setError("");
    api
      .get<{ data: Team }>(`/teams/${teamId}`)
      .then((res) => setTeam(res.data.data))
      .catch((err) => {
        if (err.response?.status === 403) {
          setError("Kamu bukan anggota tim ini.");
        } else {
          setError("Gagal memuat data tim.");
        }
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Kembali
        </button>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-red-400">{error || "Tim tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  // ProtectedRoute ensures user is logged in, but TS needs a guard
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
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">{team.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {team.description || "Tidak ada deskripsi."}
        </p>
      </div>
      <Outlet context={context} />
    </div>
  );
}
