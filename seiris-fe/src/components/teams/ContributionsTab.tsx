import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/api/axios";
import type { Contribution, ContributionStatus } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { cn } from "@/lib/utils";
import ContributionCard from "@/components/ui/ContributionCard";
import ContributionForm from "@/components/ui/ContributionForm";
import { Plus, Loader2 } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";

type Filter = "all" | ContributionStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "REJECTED", label: "Ditolak" },
];

export default function ContributionsTab() {
  const { team, fmr } = useOutletContext<TeamContext>();
  const teamId = team.id;
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

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

  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  const filtered = filter === "all" ? contributions : contributions.filter((c) => c.status === filter);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-gray-800 bg-gray-900/50 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
                  onClick={() => { setFilter(f.key); setPage(1); }}
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
          // Initial load skeleton
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
                {filter === "all" ? "Belum ada kontribusi. Buat kontribusi pertama!" : "Tidak ada kontribusi dengan status ini."}
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
    </div>
  );
}
