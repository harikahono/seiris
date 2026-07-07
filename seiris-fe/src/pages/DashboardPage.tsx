import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamContext } from "@/contexts/TeamContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import type { Team, EquityData, Contribution } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import EquityPieCard from "@/components/ui/EquityPieCard";
import MemberContributionRadar from "@/components/ui/MemberContributionRadar";
import {
  Copy, Check, ChevronRight,
  TrendingUp, FileText, UserCheck, PieChart, ClipboardList, Users,
} from "lucide-react";

// ── Equity Hero Card ──────────────────────────────────────────
function EquityHero({
  myPct,
  mySlices,
  totalSlices,
}: {
  myPct: number;
  mySlices: number;
  totalSlices?: number;
}) {
  const hasEquity = mySlices > 0;

  if (!hasEquity) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-card p-10 text-center">
        <PieChart className="mb-3 size-8 text-gray-600" />
        <p className="text-sm text-gray-500">Belum ada equity. Buat kontribusi untuk mulai.</p>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-card via-card to-accent/5 p-8 transition-all duration-500 hover:to-accent/10">
      {/* Glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-accent/5 blur-3xl transition-opacity duration-500 group-hover:opacity-60" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-accent/3 blur-2xl" />

      <div className="relative">
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
          Equity Saya
        </span>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-6xl font-bold tracking-tight text-accent">
            {myPct}%
          </span>
          <span className="text-sm text-gray-500">dari total equity</span>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="font-mono text-gray-400">
            {mySlices.toLocaleString("id-ID")}
            <span className="ml-1 text-gray-600">slices</span>
          </span>
          {totalSlices && (
            <>
              <span className="text-gray-700">/</span>
              <span className="font-mono text-gray-400">
                {totalSlices.toLocaleString("id-ID")}
                <span className="ml-1 text-gray-600">total</span>
              </span>
            </>
          )}
        </div>

        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-accent transition-all delay-75 duration-700"
            style={{ width: `${Math.max(myPct, 2)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof PieChart;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="group rounded-xl border border-gray-800 bg-card p-4 transition-all duration-200 hover:border-gray-700 hover:-translate-y-0.5">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-gray-800">
          <Icon className="size-4 text-gray-400" />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

// ── Team Overview ──────────────────────────────────────────────
function TeamDashboard({ teamId }: { teamId: string }) {
  const { user } = useAuth();
  const { refreshVersion } = useRealtime();
  const [team, setTeam] = useState<Team | null>(null);
  const [equity, setEquity] = useState<EquityData | null>(null);
  const [recentContribs, setRecentContribs] = useState<Contribution[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalDistributed, setTotalDistributed] = useState(0);
  const [totalContribCount, setTotalContribCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(() => {
    return Promise.all([
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
      .catch(console.error);
  }, [teamId]);

  // Initial load → loading=true
  useEffect(() => {
    fetchData().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  // Background refresh from Pusher → silent
  const prevRefresh = useRef(0);
  useEffect(() => {
    if (prevRefresh.current === 0) { prevRefresh.current = refreshVersion; return; }
    prevRefresh.current = refreshVersion;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  const copyInviteCode = () => {
    if (!team) return;
    navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    toast.success("Kode undangan disalin");
    setTimeout(() => setCopied(false), 2000);
  };

  const myMember = team?.members?.find((m) => m.user.id === user?.id);
  const myEquity = myMember
    ? equity?.equity_map?.find((e) => e.member_id === myMember.id)
    : null;
  const myPct = myEquity?.equity_pct ?? 0;
  const mySlices = myEquity?.slices ?? 0;

  if (loading) return <TeamDashboardSkeleton />;
  if (!team) return <p className="text-red-400">Gagal memuat data tim.</p>;

  const totalMembers = team.members_count ?? team.members?.length ?? 0;
  const pendingCount = recentContribs.filter((c) => c.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-6 pt-10 pb-8">
      {/* ── Staggered entry container ── */}
      <div className="space-y-5">
        {/* ── Team Header ── */}
        <div className="animate-fade-in-up">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold tracking-tight text-white">{team.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{team.description || "Tidak ada deskripsi."}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <code className="hidden rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-1.5 font-mono text-sm tracking-widest text-accent backdrop-blur-sm lg:block">
                {team.invite_code}
              </code>
              <button
                type="button"
                onClick={copyInviteCode}
                className="rounded-lg border border-gray-700/50 p-2 text-gray-400 transition hover:border-accent hover:text-accent"
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
          <div className="mt-4 h-px bg-gradient-to-r from-gray-800 to-transparent" />
        </div>

        {/* ── Stats Grid — asymmetric ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Equity Hero — row-span-2 on desktop */}
          <div className="animate-fade-in-up sm:row-span-2" style={{ animationDelay: "0ms" }}>
            <EquityHero
              myPct={myPct}
              mySlices={mySlices}
              totalSlices={equity?.total_slices}
            />
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            <StatCard
              icon={FileText}
              label="Total Kontribusi"
              value={String(totalContribCount)}
              sub={pendingCount > 0 ? `${pendingCount} pending` : undefined}
            />
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: "160ms" }}>
            <StatCard
              icon={UserCheck}
              label="Anggota Aktif"
              value={String(totalMembers)}
            />
          </div>

          {/* Revenue — full-width below the 2×2 grid */}
          <div className="animate-fade-in-up sm:col-span-2" style={{ animationDelay: "240ms" }}>
            <div className="group rounded-xl border border-gray-800 bg-card p-4 transition-all duration-200 hover:border-gray-700 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-full bg-gray-800">
                    <TrendingUp className="size-4 text-gray-400" />
                  </div>
                  <span className="text-xs text-gray-500">Total Revenue</span>
                </div>
                <Link
                  to={`/teams/${teamId}/revenue`}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
                >
                  Detail <ChevronRight className="size-3" />
                </Link>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <p className="text-2xl font-bold text-white">
                  Rp {(totalRevenue / 1000).toFixed(0)}rb
                </p>
                {totalDistributed > 0 && (
                  <span className="text-xs text-gray-500">
                    {((totalDistributed / totalRevenue) * 100).toFixed(0)}% didistribusi
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

{/* ── Equity Distribution ── */}
        <div className="animate-fade-in-up" style={{ animationDelay: "320ms" }}>
          {equity?.equity_map && equity.equity_map.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Left: equity bars + contribution type radar */}
              <div className="flex flex-col gap-4">
                {/* Equity distribution bars */}
                <div className="rounded-xl border border-gray-800 bg-card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Distribusi Equity</h3>
                    <span className="text-xs text-gray-500">
                      {equity.equity_map.length} anggota
                    </span>
                  </div>
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
                                {isMe && <span className="ml-1 text-gray-500">(Saya)</span>}
                              </span>
                              <span className="font-mono text-xs text-gray-500">
                                {entry.equity_pct}%
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  isMe ? "bg-accent" : "bg-gray-600"
                                )}
                                style={{ width: `${Math.max(entry.equity_pct, 2)}%` }}
                              />
                            </div>
                          </div>
                          <span className="font-mono text-xs text-gray-500">
                            {entry.slices.toLocaleString("id-ID")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Member contribution radar — fetches all approved contributions internally */}
                <MemberContributionRadar teamId={teamId} />
              </div>

              {/* Right: equity pie */}
              <EquityPieCard
                members={equity.equity_map}
                totalSlices={equity.total_slices}
                isFrozen={equity.is_frozen}
              />
            </div>
          ) : (
            <EmptyState
              icon={PieChart}
              title="Belum ada equity"
              description="Equity akan muncul setelah kontribusi pertama disetujui."
            />
          )}
        </div>

        {/* ── Recent Contributions ── */}
        <div className="animate-fade-in-up rounded-xl border border-gray-800 bg-card p-5" style={{ animationDelay: "400ms" }}>
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
            <EmptyState
              icon={ClipboardList}
              title="Belum ada kontribusi"
              description="Kontribusi terbaru akan muncul di sini."
            />
          ) : (
            <div className="divide-y divide-gray-800">
              {recentContribs.map((c) => (
                <Link
                  key={c.id}
                  to={`/teams/${teamId}/contributions/${c.id}`}
                  className="flex items-center justify-between gap-4 px-1 py-3 text-sm transition hover:opacity-80"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {/* Avatar */}
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-800 text-[10px] font-bold text-gray-500">
                      {c.member?.user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-gray-300">{c.description}</p>
                      <p className="text-xs text-gray-500">
                        {c.member?.user?.name ?? "—"} &middot;{" "}
                        {new Date(c.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-xs text-gray-600">
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
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────
function TeamDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-6 pt-10 pb-8">
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 sm:row-span-2" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28 sm:col-span-2" />
      </div>
      <Skeleton className="h-56" />
      <Skeleton className="h-64" />
    </div>
  );
}

// ── No Teams State ─────────────────────────────────────────────
function NoTeamsState() {
  return (
    <EmptyState
      icon={Users}
      title="Belum punya tim"
      description="Buat tim baru atau gabung tim lewat tombol Gabung / Buat Tim di sidebar."
    />
  );
}

// ── Main Dashboard Page ───────────────────────────────────────
export default function DashboardPage() {
  const { currentTeamId, teams, isLoading, setCurrentTeam } = useTeamContext();

  // Auto-select first team if currentTeamId is missing or invalid
  useEffect(() => {
    if (isLoading) return;
    if (teams.length === 0) return;
    if (currentTeamId && teams.some((t) => t.id === currentTeamId)) return;

    setCurrentTeam(teams[0].id);
  }, [isLoading, teams, currentTeamId, setCurrentTeam]);

  if (isLoading) return <TeamDashboardSkeleton />;

  if (currentTeamId && teams.some((t) => t.id === currentTeamId)) {
    return <TeamDashboard teamId={currentTeamId} />;
  }

  if (teams.length === 0) return <NoTeamsState />;

  return <TeamDashboardSkeleton />;
}
