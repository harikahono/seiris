import { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/api/axios";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Contribution, ContributionStatus, EquityData } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { cn } from "@/lib/utils";
import ContributionCard from "@/components/ui/ContributionCard";
import ContributionForm from "@/components/ui/ContributionForm";
import EquityPieCard from "@/components/ui/EquityPieCard";
import ContributionTypeBar from "@/components/ui/ContributionTypeBar";
import MemberEquityTable from "@/components/ui/MemberEquityTable";
import ExportPdfButton from "@/components/ui/ExportPdfButton";
import Pagination from "@/components/ui/Pagination";
import { Plus, Loader2, ListChecks, Lock } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { toast } from "sonner";

type Filter = "all" | ContributionStatus;
type View = "contributions" | "equity";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "REJECTED", label: "Ditolak" },
];

export default function ContributionsTab() {
  const { team, fmr } = useOutletContext<TeamContext>();
  const teamId = team.id;
  const { currentProjectId, projects } = useProjectContext();
  const { refreshVersion } = useRealtime();
  const { user } = useAuth();
  const isProjectFrozen = !!currentProjectId && (projects.find((p) => p.id === currentProjectId)?.is_frozen ?? false);
  const myMember = user ? team.members.find((m) => m.user.id === user.id) : undefined;
  const isCurrentUserProjectMember = !currentProjectId || (myMember?.project_fmr ?? null) !== null;

  // basePath: kalau ada project -> scoped, kalau null -> tim (induk)
  const basePath = currentProjectId
    ? `/teams/${teamId}/projects/${currentProjectId}`
    : `/teams/${teamId}`;

  // ── Toggle view ──
  const [view, setView] = useState<View>("contributions");

  // ── Equity state ──
  const [equity, setEquity] = useState<EquityData | null>(null);
  const [equityLoading, setEquityLoading] = useState(true);

  // ── Contributions state ──
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // ── Fetch Equity (no loading state — caller manages it) ──
  const fetchEquity = useCallback(() => {
    return api
      .get<{ data: EquityData }>(`${basePath}/equity`)
      .then((res) => setEquity(res.data.data))
      .catch(() => { setEquity(null); toast.error("Gagal memuat equity"); });
  }, [basePath]);

  // Track basePath changes (project switch) untuk reset page
  const prevBasePath = useRef(basePath);

  // ── Fetch Contributions (server-side filter) ──
  const fetchContributions = useCallback(() => {
    const params: Record<string, unknown> = { page };
    if (filter !== 'all') params.status = filter;
    return api
      .get<{ data: Contribution[]; meta: { current_page: number; last_page: number } }>(
        `${basePath}/contributions`,
        { params }
      )
      .then((res) => {
        setContributions(res.data.data);
        setLastPage(res.data.meta.last_page);
      })
      .catch(() => toast.error("Gagal memuat kontribusi"));
  }, [basePath, page, filter]);

  // Mount + page/filter change → fetch data.
  // basePath change (project switch) → reset page 1 dulu, baru fetch.
  useEffect(() => {
    setLoading(true);
    setEquityLoading(true);

    if (prevBasePath.current !== basePath) {
      prevBasePath.current = basePath;
      setPage(1);
      return; // tunggu page=1 propagasi, nanti fire ulang
    }

    Promise.all([fetchEquity(), fetchContributions()])
      .finally(() => { setLoading(false); setEquityLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, page, filter]);

  // Background refresh dari Pusher → silent, no skeleton
  const prevRefresh = useRef(0);
  useEffect(() => {
    if (prevRefresh.current === 0) { prevRefresh.current = refreshVersion; return; }
    prevRefresh.current = refreshVersion;
    fetchEquity();
    fetchContributions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  const members = equity?.equity_map ?? [];
  const totalSlices = equity?.total_slices ?? 0;
  const isFrozen = equity?.is_frozen ?? false;

  // Page change → loading supaya spinner muncul
  const handlePageChange = (p: number) => { setPage(p); setLoading(true); };

  return (
    <div className="space-y-6">
      {isProjectFrozen && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-card px-4 py-3 text-sm text-gray-400">
          <Lock className="size-4 shrink-0 text-gray-500" />
          <span>Project ini sudah dikunci — seluruh perubahan sudah tidak bisa dilakukan.</span>
        </div>
      )}
      {/* ── Toggle: Kontribusi / Equity ── */}
      <div className="inline-flex rounded-lg border border-gray-700/20 bg-gray-900/30 p-1">
        <button
          type="button"
          onClick={() => setView("contributions")}
          className={cn(
            "rounded-md px-5 py-2 text-sm font-medium transition-colors",
            view === "contributions"
              ? "bg-accent text-black shadow-sm"
              : "text-gray-500 hover:text-gray-300"
          )}
        >
          Kontribusi
        </button>
        <button
          type="button"
          onClick={() => setView("equity")}
          className={cn(
            "rounded-md px-5 py-2 text-sm font-medium transition-colors",
            view === "equity"
              ? "bg-accent text-black shadow-sm"
              : "text-gray-500 hover:text-gray-300"
          )}
        >
          Equity
        </button>
      </div>

      {/* ── Kontribusi View ── */}
      {view === "contributions" && (
        <>
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Kontribusi</h2>
              <div className="inline-flex rounded-lg border border-gray-700/20 bg-gray-900/30 p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setFilter(f.key);
                      setPage(1);
                      setLoading(true);
                    }}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      filter === f.key
                        ? "bg-accent text-black shadow-sm"
                        : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                disabled={isProjectFrozen || (currentProjectId !== null && !isCurrentUserProjectMember)}
                title={isProjectFrozen ? "Project sudah dikunci, kontribusi baru tidak bisa ditambah" : (!isCurrentUserProjectMember ? "Kamu bukan anggota project ini — hanya bisa melihat" : undefined)}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]"
              >
                <Plus className="size-4" />
                Kontribusi
              </button>
            </div>

            {currentProjectId !== null && !isCurrentUserProjectMember && !loading && (
              <p className="mb-3 rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-xs text-gray-500">
                Mode lihat saja — kamu bukan anggota project ini. Minta owner menambahkanmu untuk bisa kontribusi &amp; vote.
              </p>
            )}

            <div className="relative">
              {loading && page === 1 ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="relative pl-7 py-2">
                      {/* Timeline dot skeleton */}
                      <Skeleton className="absolute left-2 top-[14px] size-[10px] rounded-full" />
                      {i < 3 && <Skeleton className="absolute left-[11px] top-[26px] bottom-0 w-px h-[calc(100%-14px)]" />}
                      <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="size-7 rounded-full shrink-0" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                        <Skeleton className="ml-auto h-4 w-24" />
                      </div>
                      <Skeleton className="h-3 w-3/4 mb-1.5" />
                      <div className="flex gap-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {contributions.map((c, i) => (
                    <ContributionCard key={c.id} contribution={c} teamId={teamId} isLast={i === contributions.length - 1} />
                  ))}
                  {!loading && contributions.length === 0 && (
                    <EmptyState
                      icon={ListChecks}
                      title={filter === "all" ? "Belum ada kontribusi" : "Tidak ditemukan"}
                      description={filter === "all"
                        ? "Catat kontribusi pertama untuk mulai menghitung equity."
                        : `Tidak ada kontribusi dengan status "${filter}".`}
                    />
                  )}
                  {loading && (
                    <div className="flex justify-center py-8">
                      <Loader2 className="size-5 animate-spin text-gray-500" />
                    </div>
                  )}
                </>
              )}
            </div>

            {!loading && (
              <div className="mt-4 flex justify-center">
                <Pagination current={page} last={lastPage} onChange={handlePageChange} />
              </div>
            )}
          </div>

          <ContributionForm
            teamId={teamId}
            projectId={currentProjectId}
            fmr={fmr}
            open={showForm}
            onClose={() => setShowForm(false)}
            onCreated={() => {
              setPage(1);
              setContributions([]);
              fetchContributions(); // ← fetch immediately after clear
            }}
          />
        </>
      )}

      {/* ── Equity View ── */}
      {view === "equity" && (
        <div className="space-y-4">
          {equityLoading ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
              <Skeleton className="h-32 w-full rounded-xl" />
            </>
          ) : equity ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Total Slices: {totalSlices.toLocaleString("id-ID")}
                  {isFrozen && <span className="ml-2 text-red-400">Frozen</span>}
                  {equity.calculated_at && (
                    <span className="ml-2">
                      ·{" "}
                      {new Date(equity.calculated_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </p>
                <ExportPdfButton teamId={teamId} projectId={currentProjectId} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <EquityPieCard members={members} totalSlices={totalSlices} isFrozen={isFrozen} />
                <ContributionTypeBar slices_by_type={equity.slices_by_type} />
              </div>

              <MemberEquityTable members={members} />
            </>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              Belum ada data equity. Setelah kontribusi disetujui, equity akan muncul di sini.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
