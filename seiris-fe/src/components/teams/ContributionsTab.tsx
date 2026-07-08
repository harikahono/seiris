import { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/api/axios";
import { useRealtime } from "@/contexts/RealtimeContext";
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
import { Plus, Loader2, ListChecks } from "lucide-react";
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
  const { refreshVersion } = useRealtime();

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
      .get<{ data: EquityData }>(`/teams/${teamId}/equity`)
      .then((res) => setEquity(res.data.data))
      .catch(() => { setEquity(null); toast.error("Gagal memuat equity"); });
  }, [teamId]);

  // ── Fetch Contributions (server-side filter) ──
  const fetchContributions = useCallback(() => {
    const params: Record<string, unknown> = { page };
    if (filter !== 'all') params.status = filter;
    return api
      .get<{ data: Contribution[]; meta: { current_page: number; last_page: number } }>(
        `/teams/${teamId}/contributions`,
        { params }
      )
      .then((res) => {
        setContributions(res.data.data);
        setLastPage(res.data.meta.last_page);
      })
      .catch(() => toast.error("Gagal memuat kontribusi"));
  }, [teamId, page, filter]);

  // Initial load + page change → loading=true from initial state
  useEffect(() => {
    Promise.all([fetchEquity(), fetchContributions()])
      .finally(() => { setLoading(false); setEquityLoading(false); });
  }, [fetchEquity, fetchContributions]);

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
      {/* ── Toggle: Kontribusi / Equity ── */}
      <div className="flex gap-1 rounded-lg border border-gray-800 bg-card/50 p-1 w-fit">
        <button
          type="button"
          onClick={() => setView("contributions")}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
            view === "contributions"
              ? "bg-accent text-black"
              : "text-gray-400 hover:text-white"
          )}
        >
          Kontribusi
        </button>
        <button
          type="button"
          onClick={() => setView("equity")}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
            view === "equity"
              ? "bg-accent text-black"
              : "text-gray-400 hover:text-white"
          )}
        >
          Equity
        </button>
      </div>

      {/* ── Kontribusi View ── */}
      {view === "contributions" && (
        <>
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Kontribusi</h2>
              <div className="flex gap-1 rounded-lg border border-gray-800 bg-card/50 p-1">
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
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      filter === f.key
                        ? "bg-accent text-black"
                        : "text-gray-400 hover:text-white"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-accent-hover"
              >
                <Plus className="size-4" />
                Kontribusi
              </button>
            </div>

            <div className="relative">
              {loading && page === 1 ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
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
                        ? "Buat kontribusi pertama untuk mulai menghitung equity."
                        : `Tidak ada kontribusi dengan status "${filter}".`}
                      action={filter === "all" ? { label: "Buat Kontribusi", onClick: () => setShowForm(true) } : undefined}
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
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
              <Skeleton className="h-32 w-full" />
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
                <ExportPdfButton teamId={teamId} />
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
