import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/api/axios";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import type { Team, TeamMember, Contribution } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import UserAvatar from "@/components/ui/UserAvatar";
import { ArrowLeft, RefreshCw, Loader2, Plus } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function MemberDetailPage() {
  const { teamId, memberId } = useParams<{ teamId: string; memberId: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [member, setMember] = useState<TeamMember | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isBackground = false) => {
    if (!teamId || !memberId) return;
    if (isBackground) setRefreshing(true);

    try {
      const [teamRes, contribRes] = await Promise.all([
        api.get<{ data: Team }>(`/teams/${teamId}`),
        api.get<{ data: Contribution[] }>(`/teams/${teamId}/contributions`, {
          params: { member_id: memberId, per_page: 10 },
        }),
      ]);

      const t = teamRes.data.data;
      setTeam(t);
      const m = t.members.find((mem) => mem.id === memberId) ?? null;
      setMember(m);
      setContributions(contribRes.data.data ?? []);
    } catch {
      toast.error("Gagal memuat data anggota");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [teamId, memberId]);

  // Realtime
  const { refreshVersion } = useRealtime();
  const { currentProjectId } = useProjectContext();
  const prevRefresh = useRef(0);
  useEffect(() => {
    if (prevRefresh.current === 0) { prevRefresh.current = refreshVersion; return; }
    prevRefresh.current = refreshVersion;
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  if (initialLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 px-6 pt-10 pb-8">
        <Skeleton className="h-4 w-16" />
        {/* Profile card */}
        <div className="rounded-xl border border-gray-800/50 bg-card p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          </div>
        </div>
        {/* Stats */}
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-28 rounded-lg" />
          ))}
        </div>
        {/* Contributions */}
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors"
          aria-label="Kembali" title="Kembali"
        >
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Kembali</span>
        </button>
        <p className="text-red-400">Anggota tidak ditemukan.</p>
      </div>
    );
  }

  // Hitung slices = sum of contributions
  const totalSlices = contributions.reduce((s, c) => s + c.total_slices, 0);
  const totalValue = contributions.reduce((s, c) => s + c.value, 0);
  const activeContribs = contributions.filter((c) => c.status !== "REJECTED").length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-6 pt-10 pb-8">
      {/* ── Back ── */}
      <div className="animate-fade-in-up flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors"
          aria-label="Kembali" title="Kembali"
        >
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Kembali</span>
        </button>
        {refreshing && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <RefreshCw className="size-3 animate-spin" />
            Memperbarui...
          </span>
        )}
      </div>

      {/* ── Profile Card ── */}
      <div className="animate-fade-in-up rounded-xl border border-gray-800 bg-card p-6 transition-colors duration-200 hover:border-gray-700">
        <div className="flex items-center gap-4">
          <UserAvatar user={member.user} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-white">{member.user.name}</h1>
              {member.role === "owner" ? (
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-medium text-accent">Owner</span>
              ) : (
                <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-[11px] text-gray-400">Member</span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{member.user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>
                <span className="text-gray-400">FMR:</span>{" "}
                <span className="font-mono text-white">Rp {member.fmr.toLocaleString("id-ID")}</span>
              </span>
              <span>
                <span className="text-gray-400">Bergabung:</span>{" "}
                {new Date(member.joined_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <StatusBadge status={member.status === "exited" ? "REJECTED" : "APPROVED"} />
              {member.status === "exited" && member.exited_at && (
                <span className="text-red-400">
                  Keluar: {new Date(member.exited_at).toLocaleDateString("id-ID")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="animate-fade-in-up flex flex-wrap gap-4" style={{ animationDelay: "80ms" }}>
        <div className="min-w-[130px] rounded-lg border border-gray-800 bg-gray-950/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Kontribusi</p>
          <p className="mt-1 font-mono text-sm font-medium text-white">{totalValue > 0 ? totalValue.toLocaleString("id-ID") : 0}</p>
        </div>
        <div className="min-w-[110px] rounded-lg border border-gray-800 bg-gray-950/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500" title="Total slices dari semua kontribusi">Total Slices</p>
          <p className="mt-1 font-mono text-sm font-medium text-accent">{totalSlices.toLocaleString("id-ID")}</p>
        </div>
        <div className="min-w-[130px] rounded-lg border border-gray-800 bg-gray-950/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Aktif</p>
          <p className="mt-1 font-mono text-sm font-medium text-white">{activeContribs} kontribusi</p>
        </div>
      </div>

      {/* ── Recent Contributions ── */}
      <div className="animate-fade-in-up space-y-3" style={{ animationDelay: "160ms" }}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 rounded-full bg-accent/50" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Kontribusi Terbaru</h2>
        </div>

        {contributions.length === 0 ? (
          <div className="rounded-lg border border-gray-800 bg-card p-6 text-center">
            <p className="text-sm text-gray-500">Belum ada kontribusi.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {contributions.map((c) => (
              <Link
                key={c.id}
                to={`/teams/${teamId}/contributions/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-card/50 px-4 py-3 transition-colors hover:bg-card hover:border-gray-700"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{c.description || c.type}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {new Date(c.contribution_date).toLocaleDateString("id-ID")} &middot; {c.type}
                    {c.project_id && <>&middot; Project</>}
                  </p>
                </div>
                <div className="ml-3 text-right shrink-0">
                  <p className="text-sm font-mono text-accent">+{c.total_slices.toLocaleString("id-ID")}</p>
                  <p className="text-[11px] text-gray-500">Rp {c.value.toLocaleString("id-ID")}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
