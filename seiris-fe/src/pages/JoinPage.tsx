import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamContext } from "@/contexts/TeamContext";
import api from "@/api/axios";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Loader2, XCircle, Users, Calendar, ShieldAlert } from "lucide-react";

interface TeamPreview {
  team_id: string;
  name: string;
  description: string | null;
  members_count: number;
  owner_name: string;
  created_at: string;
  is_member: boolean;
}

type PageState =
  | { type: "loading" }
  | { type: "confirm"; preview: TeamPreview }
  | { type: "error"; message: string }
  | { type: "invalid"; message: string };

export default function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { setCurrentTeam, refreshTeams } = useTeamContext();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>({ type: "loading" });
  const [joining, setJoining] = useState(false);

  // ── Fetch preview ──
  useEffect(() => {
    if (authLoading || !user || !inviteCode) return;
    setState({ type: "loading" });

    api
      .get<{ data: TeamPreview }>(`/teams/invite/${inviteCode.toUpperCase()}`)
      .then((res) => setState({ type: "confirm", preview: res.data.data }))
      .catch((err) => {
        if (isAxiosError(err) && err.response?.status === 404) {
          setState({ type: "invalid", message: "Undangan tidak valid atau sudah kadaluwarsa." });
        } else {
          setState({ type: "error", message: "Gagal memuat undangan. Coba lagi nanti." });
        }
      });
  }, [inviteCode, user, authLoading]);

  // ── Join handler ──
  const handleJoin = async () => {
    if (!inviteCode) return;
    setJoining(true);

    try {
      const res = await api.post("/teams/join", { invite_code: inviteCode.toUpperCase() });
      const teamId: string = res.data?.data?.team_id ?? res.data?.data?.id;
      setCurrentTeam(teamId);
      refreshTeams();
      toast.success("Berhasil bergabung ke tim!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        const msg = err.response.data?.message ?? "Gagal bergabung.";
        setState({ type: "error", message: msg });
      } else {
        setState({ type: "error", message: "Terjadi kesalahan. Coba lagi." });
      }
    } finally {
      setJoining(false);
    }
  };

  // ── Auth guard ──
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="size-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=/join/${inviteCode}`} replace />;
  }

  if (!inviteCode) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Render states ──
  const initials = state.type === "confirm" ? state.preview.name.charAt(0).toUpperCase() : "?";

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Invalid / 404 */}
        {state.type === "invalid" && (
          <div className="rounded-xl border border-gray-800 bg-card p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="size-7 text-red-400" />
            </div>
            <h1 className="mb-2 text-lg font-semibold text-white">Undangan Tidak Valid</h1>
            <p className="mb-6 text-sm text-gray-400">{state.message}</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-colors active:scale-[0.97] hover:bg-accent-hover"
            >
              Ke Dashboard
            </Link>
          </div>
        )}

        {/* Error (fetch gagal / join gagal) */}
        {state.type === "error" && (
          <div className="rounded-xl border border-gray-800 bg-card p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-500/10">
              <ShieldAlert className="size-7 text-red-400" />
            </div>
            <h1 className="mb-2 text-lg font-semibold text-white">Gagal Bergabung</h1>
            <p className="mb-6 text-sm text-gray-400">{state.message}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setState({ type: "loading" })}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800"
              >
                Coba Lagi
              </button>
              <Link
                to="/dashboard"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-colors active:scale-[0.97] hover:bg-accent-hover"
              >
                Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Loading (fetch preview) */}
        {state.type === "loading" && (
          <div className="rounded-xl border border-gray-800 bg-card p-8 text-center shadow-2xl">
            <Loader2 className="mx-auto mb-4 size-8 animate-spin text-gray-500" />
            <p className="text-sm text-gray-400">Memuat undangan...</p>
          </div>
        )}

        {/* Confirm card — udah member */}
        {state.type === "confirm" && state.preview.is_member && (
          <div className="rounded-xl border border-gray-800 bg-card p-8 shadow-2xl">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-xl font-bold text-emerald-400">
              {initials}
            </div>

            <h1 className="text-center text-xl font-bold text-white">{state.preview.name}</h1>
            {state.preview.description && (
              <p className="mt-2 text-center text-sm text-gray-400 leading-relaxed">{state.preview.description}</p>
            )}

            <div className="mx-auto mt-5 flex items-center justify-center gap-5 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" />
                {state.preview.members_count} anggota
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="size-3.5" />
                {state.preview.owner_name}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {new Date(state.preview.created_at).getFullYear()}
              </span>
            </div>

            <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-center">
              <p className="text-sm font-medium text-emerald-400">
                Kamu sudah bergabung di tim ini
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <Link
                to={`/teams/${state.preview.team_id}/members`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-colors active:scale-[0.97] hover:bg-accent-hover"
              >
                Ke Tim
              </Link>
              <Link
                to="/dashboard"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Confirm card — join */}
        {state.type === "confirm" && !state.preview.is_member && (
          <div className="rounded-xl border border-gray-800 bg-card p-8 shadow-2xl">
            {/* Avatar tim */}
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-accent/15 text-xl font-bold text-accent">
              {initials}
            </div>

            <h1 className="text-center text-xl font-bold text-white">{state.preview.name}</h1>
            {state.preview.description && (
              <p className="mt-2 text-center text-sm text-gray-400 leading-relaxed">{state.preview.description}</p>
            )}

            {/* Info baris */}
            <div className="mx-auto mt-5 flex items-center justify-center gap-5 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" />
                {state.preview.members_count} anggota
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="size-3.5" />
                {state.preview.owner_name}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {new Date(state.preview.created_at).getFullYear()}
              </span>
            </div>

            {/* CTA */}
            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-colors active:scale-[0.97] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {joining ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Terima Undangan"
                )}
              </button>
              <Link
                to="/dashboard"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                Batal
              </Link>
            </div>
          </div>
        )}

        {/* Branding */}
        <p className="mt-6 text-center text-xs text-gray-600">
          <Link to="/" className="hover:text-gray-400 transition-colors">SEIRIS</Link> &mdash; Equity Management
        </p>
      </div>
    </div>
  );
}
