import { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/api/axios";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import type { Revenue } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { Loader2, Plus, TrendingUp } from "lucide-react";
import RevenueCard from "@/components/ui/RevenueCard";
import CreateRevenueForm from "@/components/ui/CreateRevenueForm";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { toast } from "sonner";

export default function RevenueTab() {
  const { team, isOwner } = useOutletContext<TeamContext>();
  const teamId = team.id;
  const { currentProjectId } = useProjectContext();
  const { refreshVersion } = useRealtime();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  // ── Fetch Revenues (no loading state — caller manages it) ──
  const fetchRevenues = useCallback(() => {
    return api
      .get<{ data: Revenue[]; meta: { current_page: number; last_page: number; total: number } }>(
        `/teams/${teamId}/revenues`,
        { params: { page } }
      )
      .then((res) => {
        setRevenues(res.data.data);
        setLastPage(res.data.meta.last_page);
      })
      .catch(() => toast.error("Gagal memuat revenue"));
  }, [teamId, page]);

  // Initial load + page/scope change → reset page + loading
  useEffect(() => {
    setPage(1);
    setRevenues([]);
    fetchRevenues().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  // Page change → loading + fetch with new page
  const handlePageChange = (p: number) => { setPage(p); setLoading(true); };

  // Background refresh dari Pusher → silent, no skeleton
  const prevRefresh = useRef(0);
  useEffect(() => {
    if (prevRefresh.current === 0) { prevRefresh.current = refreshVersion; return; }
    prevRefresh.current = refreshVersion;
    fetchRevenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  const totalAmount = revenues.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Revenue</h2>
          <p className="text-xs text-gray-500">
            {revenues.length} revenue · {totalAmount.toLocaleString("id-ID")} total
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent-hover"
          >
            <Plus className="size-4" />
            Catat Revenue
          </button>
        )}
      </div>

      <div className="space-y-4">
        {revenues.length === 0 && !loading && (
          <EmptyState
            icon={TrendingUp}
            title="Belum ada revenue"
            description={isOwner
              ? "Catat revenue pertama untuk mulai distribusi profit."
              : "Belum ada revenue yang dicatat."}
            action={isOwner ? { label: "Catat Revenue", onClick: () => setShowForm(true) } : undefined}
          />
        )}

        {revenues.map((r) => (
          <RevenueCard key={r.id} revenue={r} isOwner={isOwner} onDistributed={fetchRevenues} />
        ))}

        {loading && page === 1 ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-800/50 bg-card p-5 space-y-3">
                {/* Amount hero */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="space-y-1.5 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                </div>
                {/* Meta row */}
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-gray-500" />
          </div>
        )}
      </div>

      {!loading && (
        <div className="flex justify-center">
          <Pagination current={page} last={lastPage} onChange={handlePageChange} />
        </div>
      )}

      <CreateRevenueForm
        teamId={teamId}
        projectId={currentProjectId}
        open={showForm}
        onClose={() => setShowForm(false)}
        onCreated={() => {
          setPage(1);
          setRevenues([]);
        }}
      />
    </div>
  );
}
