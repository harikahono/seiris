import { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/api/axios";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
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
  const basePath = currentProjectId
    ? `/teams/${teamId}/projects/${currentProjectId}`
    : `/teams/${teamId}`;
  const { user } = useAuth();
  const isCurrentUserProjectMember = !currentProjectId || (user != null && team.members.find((m) => m.user.id === user.id)?.project_fmr !== null);
  const { refreshVersion } = useRealtime();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [equitySlices, setEquitySlices] = useState<number | null>(null);

  // ── Fetch Revenues (no loading state — caller manages it) ──
  const fetchRevenues = useCallback(() => {
    return api
      .get<{ data: Revenue[]; meta: { current_page: number; last_page: number; total: number } }>(
        `${basePath}/revenues`,
        { params: { page } }
      )
      .then((res) => {
        setRevenues(res.data.data);
        setLastPage(res.data.meta.last_page);
      })
      .catch(() => toast.error("Gagal memuat revenue"));
  }, [basePath, page]);

  // ── Fetch equity total_slices untuk scope ini (disable tombol distribusi kalau 0) ──
  const fetchEquity = useCallback(() => {
    return api
      .get<{ data: { total_slices: number } }>(`${basePath}/equity`)
      .then((res) => setEquitySlices(res.data.data.total_slices ?? 0))
      .catch(() => setEquitySlices(null));
  }, [basePath]);

  // Initial load + page/scope/filter change → fetch
  useEffect(() => {
    setRevenues([]);
    setEquitySlices(null);
    setLoading(true);
    Promise.all([fetchRevenues(), fetchEquity()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, page]);

  // Page change → loading + fetch with new page
  const handlePageChange = (p: number) => { setPage(p); setLoading(true); };

  // Background refresh dari Pusher → silent, no skeleton
  const prevRefresh = useRef(0);
  useEffect(() => {
    if (prevRefresh.current === 0) { prevRefresh.current = refreshVersion; return; }
    prevRefresh.current = refreshVersion;
    fetchRevenues();
    fetchEquity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  const hasEquity = equitySlices !== null && equitySlices > 0;

  const totalAmount = revenues.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            disabled={team.members_count < 2}
            title={team.members_count < 2 ? "Minimal 2 anggota tim aktif" : undefined}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]"
          >
            <Plus className="size-4" />
            Catat Revenue
          </button>
        )}
      </div>

      <div className="[&>*+*]:border-t [&>*+*]:border-subtle">
        {revenues.length === 0 && !loading && (
          <EmptyState
            icon={TrendingUp}
            title="Belum ada revenue"
            description={isOwner
              ? "Catat revenue pertama untuk mulai distribusi profit."
              : "Belum ada revenue yang dicatat."}
          />
        )}

        {revenues.map((r) => (
          <RevenueCard key={r.id} revenue={r} teamId={teamId} isOwner={isOwner} hasEquity={hasEquity} isProjectMember={isCurrentUserProjectMember} onDistributed={fetchRevenues} />
        ))}

        {loading && page === 1 ? (
          <div className="space-y-5">
            {[...Array(2)].map((_, i) => (
              <div key={i} className={i > 0 ? "border-t border-subtle pt-5" : ""}>
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
                <div className="mt-4 flex items-center gap-3">
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
          fetchRevenues();
        }}
      />
    </div>
  );
}
