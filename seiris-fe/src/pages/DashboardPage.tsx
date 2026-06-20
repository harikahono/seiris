import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamContext } from "@/contexts/TeamContext";
import type { DashboardData, Team, EquityData, Contribution } from "@/types";
import CreateTeamModal from "@/components/ui/CreateTeamModal";
import JoinTeamCard from "@/components/ui/JoinTeamCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Skeleton from "@/components/ui/Skeleton";
import {
  Plus, Users, Copy, Check, ChevronRight,
  TrendingUp, FileText, UserCheck, PieChart,
} from "lucide-react";

// ── Team Overview (when a team is selected) ──────────────────
function TeamDashboard({ teamId }: { teamId: string }) {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [equity, setEquity] = useState<EquityData | null>(null);
  const [recentContribs, setRecentContribs] = useState<Contribution[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalDistributed, setTotalDistributed] = useState(0);
  const [totalContribCount, setTotalContribCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<{ data: Team }>(`/teams/${teamId}`),
      api.get<{ data: EquityData }>(`/teams/${teamId}/equity`),
      api.get<{ data: Contribution[]; meta: { total: number } }>(
        `/teams/${teamId}/contributions`, { params: { per_page: 5 } }
      ),
      api.get<{ data: { amount: number; is_distributed: boolean; distributable_amount: number }[] }>(
        `/teams/${teamId}/revenues`
      ),
    ])
      .then(([teamRes, equityRes, contribsRes, revenuesRes]) => {
        setTeam(teamRes.data.data);
        setEquity(equityRes.data.data);
        setRecentContribs(contribsRes.data.data);
        setTotalContribCount(contribsRes.data.meta?.total ?? contribsRes.data.data.length);
        const revs = revenuesRes.data.data;
        setTotalRevenue(revs.reduce((s, r) => s + r.amount, 0));
        setTotalDistributed(revs.reduce((s, r) => s + (r.is_distributed ? r.distributable_amount : 0), 0));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyInviteCode = () => {
    if (!team) return;
    navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    toast.success("Kode undangan disalin");
    setTimeout(() => setCopied(false), 2000);
  };

  // Find current user's equity entry
  const myMember = team?.members?.find((m) => m.user.id === user?.id);
  const myEquity = myMember
    ? equity?.equity_map?.find((e) => e.member_id === myMember.id)
    : null;
  const myPct = myEquity?.equity_pct ?? 0;
  const mySlices = myEquity?.slices ?? 0;

  if (loading) {
    return <TeamDashboardSkeleton />;
  }

  if (!team) {
    return <p className="text-red-400">Gagal memuat data tim.</p>;
  }

  const totalMembers = team.members_count ?? team.members?.length ?? 0;
  const pendingCount = recentContribs.filter((c) => c.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      {/* ── Team Header ── */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-white">{team.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{team.description || "Tidak ada deskripsi."}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <code className="hidden rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 font-mono text-sm tracking-widest text-accent sm:block">
              {team.invite_code}
            </code>
            <button
              type="button"
              onClick={copyInviteCode}
              className="rounded-lg border border-gray-700 p-2 text-gray-400 transition hover:border-accent hover:text-accent"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>
            Owner: <span className="text-gray-300">{team.owner.name}</span>
          </span>
          <span>{totalMembers} anggota</span>
          <span>Dibuat {new Date(team.created_at).toLocaleDateString("id-ID")}</span>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={PieChart}
          label="Equity Saya"
          value={equity ? `${myPct}%` : "—"}
          sub={equity && mySlices > 0 ? `${mySlices.toLocaleString("id-ID")} slices` : undefined}
          accent
        />
        <StatCard
          icon={FileText}
          label="Total Kontribusi"
          value={String(totalContribCount)}
          sub={pendingCount > 0 ? `${pendingCount} pending` : undefined}
        />
        <StatCard
          icon={UserCheck}
          label="Anggota Aktif"
          value={String(totalMembers)}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={`Rp ${(totalRevenue / 1000).toFixed(0)}rb`}
          sub={totalDistributed > 0 ? `${((totalDistributed / totalRevenue) * 100).toFixed(0)}% didistribusi` : undefined}
        />
      </div>

      {/* ── Equity Detail ── */}
      {equity && equity.equity_map && equity.equity_map.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Distribusi Equity</h3>
          <div className="space-y-3">
            {equity.equity_map.map((entry) => {
              const isMe = myMember?.id === entry.member_id;
              return (
                <div key={entry.member_id} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      isMe ? "bg-accent text-black" : "bg-gray-800 text-gray-400"
                    )}
                  >
                    {entry.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn(isMe ? "font-medium text-accent" : "text-gray-300")}>
                        {entry.name}
                        {isMe ? " (Saya)" : ""}
                      </span>
                      <span className="text-gray-400">{entry.equity_pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                      <div
                        className={cn("h-full rounded-full transition-all", isMe ? "bg-accent" : "bg-gray-600")}
                        style={{ width: `${Math.max(entry.equity_pct, 2)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{entry.slices.toLocaleString("id-ID")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recent Contributions ── */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Kontribusi Terbaru</h3>
          <Link
            to={`/teams/${teamId}/contributions`}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
          >
            Lihat semua <ChevronRight className="size-3" />
          </Link>
        </div>
        {recentContribs.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada kontribusi.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {recentContribs.map((c) => (
              <Link
                key={c.id}
                to={`/teams/${teamId}/contributions/${c.id}`}
                className="flex items-center justify-between gap-4 px-1 py-3 text-sm transition hover:opacity-80"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-gray-300">{c.description}</p>
                  <p className="text-xs text-gray-500">
                    {c.member?.user?.name ?? "—"} &middot;{" "}
                    {new Date(c.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-gray-600">
                    Rp {(c.value / 1000).toFixed(0)}rb
                  </span>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof PieChart;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            accent ? "bg-accent/10" : "bg-gray-800"
          )}
        >
          <Icon className={cn("size-4", accent ? "text-accent" : "text-gray-500")} />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={cn("mt-2 text-2xl font-bold", accent ? "text-accent" : "text-white")}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

// ── TeamDashboard Skeleton ─────────────────────────────────────
function TeamDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      {/* Header */}
      <Skeleton className="h-24 w-full" />
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
      {/* Equity bars */}
      <Skeleton className="h-48 w-full" />
      {/* Contributions list */}
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ── TeamGrid Skeleton ──────────────────────────────────────────
function TeamGridSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      {/* Summary cards */}
      <div className="flex flex-wrap gap-4">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="flex-1 min-w-[200px] h-24" />
        ))}
      </div>
      {/* Team cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-52 w-full" />
        ))}
      </div>
    </div>
  );
}

// ── Team Grid (when NO team is selected) ──────────────────────
function TeamGrid({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  const { setCurrentTeam, refreshTeams } = useTeamContext();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Ringkasan</h2>
        <div className="flex flex-wrap gap-4">
          <div className="rounded-lg border border-gray-800 bg-gray-900 px-5 py-3">
            <p className="text-2xl font-bold text-accent">{data.summary.total_teams}</p>
            <p className="text-xs text-gray-500">Total Tim</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 px-5 py-3">
            <p className="text-2xl font-bold text-yellow-400">{data.summary.total_pending_to_review}</p>
            <p className="text-xs text-gray-500">Pending Review</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tim Saya</h2>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-accent-hover"
          >
            <Plus className="size-4" />
            Buat Tim
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.teams.map((team) => (
            <Link
              key={team.id}
              to={`/teams/${team.id}`}
              onClick={() => setCurrentTeam(team.id)}
              className="block rounded-lg border border-gray-800 bg-gray-900 p-4 transition hover:border-accent"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">{team.name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                    team.role === "owner"
                      ? "bg-accent/20 text-accent"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {team.role}
                </span>
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                <p>
                  Equity: <span className="text-gray-300">{team.my_equity_percentage}%</span>
                </p>
                <p>
                  Slices: <span className="text-gray-300">{team.my_slices}</span>
                </p>
                <p>
                  Anggota: <span className="text-gray-300">{team.total_members}</span>
                </p>
                {team.pending_approvals_count > 0 && (
                  <p className="text-yellow-400">{team.pending_approvals_count} pending approval</p>
                )}
              </div>
            </Link>
          ))}
          {data.teams.length === 0 && (
            <p className="col-span-full text-gray-600">
              Belum bergabung ke tim mana pun. Buat tim baru atau gunakan kode undangan.
            </p>
          )}
        </div>
      </section>

      {data.teams.length === 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Users className="size-4 text-accent" />
            <h2 className="text-sm font-semibold text-gray-300">Gabung ke Tim</h2>
          </div>
          <JoinTeamCard onJoined={() => { onRefresh(); refreshTeams(); }} />
        </section>
      )}

      <CreateTeamModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => { onRefresh(); refreshTeams(); }}
      />
    </>
  );
}

// ── Main Dashboard Page ──────────────────────────────────────
export default function DashboardPage() {
  const { currentTeamId, teams, isLoading } = useTeamContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(() => {
    setLoading(true);
    api
      .get<{ message: string; data: DashboardData }>("/my-dashboard")
      .then((res) => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Mode 1: Team selected → show enhanced overview
  if (currentTeamId && teams.some((t) => t.id === currentTeamId)) {
    return <TeamDashboard teamId={currentTeamId} />;
  }

  // Mode 2: No team → show grid
  if (loading || isLoading) {
    return <TeamGridSkeleton />;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-red-400">Gagal memuat data dashboard.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <TeamGrid data={data} onRefresh={fetchDashboard} />
    </div>
  );
}
