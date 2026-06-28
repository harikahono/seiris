import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api/axios";
import { usePusher } from "@/hooks/usePusher";
import type { Contribution, ContributionStatus, EquityData } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { cn } from "@/lib/utils";
import ContributionCard from "@/components/ui/ContributionCard";
import ContributionForm from "@/components/ui/ContributionForm";
import EquityPieCard from "@/components/ui/EquityPieCard";
import ContributionTypeBar from "@/components/ui/ContributionTypeBar";
import MemberEquityTable from "@/components/ui/MemberEquityTable";
import ExportPdfButton from "@/components/ui/ExportPdfButton";
import { Plus, Loader2 } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";

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

  // ── Fetch Equity ──
  const fetchEquity = useCallback(() => {
    setEquityLoading(true);
    api
      .get<{ data: EquityData }>(`/teams/${teamId}/equity`)
      .then((res) => setEquity(res.data.data))
      .catch(() => setEquity(null))
      .finally(() => setEquityLoading(false));
  }, [teamId]);

  // ── Fetch Contributions ──
  const fetchContributions = useCallback(() => {
    setLoading(true);
    api
      .get<{ data: Contribution[]; meta: { current_page: number; last_page: number } }>(
        `/teams/${teamId}/contributions`,
        { params: { page } }
      )
      .then((res) => {
        setContributions((prev) => (page === 1 ? res.data.data : [...prev, ...res.data.data]));
        setLastPage(res.data.meta.last_page);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teamId, page]);

  // ── Pusher: realtime equity update ──
  usePusher(teamId, {
    onEquityUpdated: () => {
      fetchEquity();
      toast("Ekuitas tim telah diperbarui!");
    },
  });

  useEffect(() => {
    fetchEquity();
    fetchContributions();
  }, [fetchEquity, fetchContributions]);

  const filtered = filter === "all" ? contributions : contributions.filter((c) => c.status === filter);
  const members = equity?.equity_map ?? [];
  const totalSlices = equity?.total_slices ?? 0;
  const isFrozen = equity?.is_frozen ?? false;

  return (
    <div className="space-y-6">
      {/* ── Toggle: Kontribusi / Equity ── */}
      <div className="flex gap-1 rounded-lg border border-gray-800 bg-gray-900/50 p-1 w-fit">
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
              <div className="flex gap-1 rounded-lg border border-gray-800 bg-gray-900/50 p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setFilter(f.key);
                      setPage(1);
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

            <div className="space-y-3">
              {loading && page === 1 ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  {filtered.map((c) => (
                    <ContributionCard key={c.id} contribution={c} teamId={teamId} />
                  ))}
                  {!loading && filtered.length === 0 && (
                    <p className="py-8 text-center text-sm text-gray-500">
                      {filter === "all"
                        ? "Belum ada kontribusi. Buat kontribusi pertama!"
                        : "Tidak ada kontribusi dengan status ini."}
                    </p>
                  )}
                  {loading && (
                    <div className="flex justify-center py-8">
                      <Loader2 className="size-5 animate-spin text-gray-500" />
                    </div>
                  )}
                </>
              )}
            </div>

            {!loading && page < lastPage && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="text-sm text-accent hover:underline"
                >
                  Muat lebih banyak
                </button>
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
                <ContributionTypeBar contributions={contributions} />
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
