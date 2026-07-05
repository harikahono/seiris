import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/api/axios";
import { useRealtime } from "@/contexts/RealtimeContext";
import type { Revenue } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { Loader2, Plus } from "lucide-react";
import RevenueCard from "@/components/ui/RevenueCard";
import CreateRevenueForm from "@/components/ui/CreateRevenueForm";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";

export default function RevenueTab() {
  const { team, isOwner } = useOutletContext<TeamContext>();
  const teamId = team.id;
  const { refreshVersion } = useRealtime();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const fetchRevenues = useCallback(() => {
    setLoading(true);
    api
      .get<{ data: Revenue[]; meta: { current_page: number; last_page: number; total: number } }>(
        `/teams/${teamId}/revenues`,
        { params: { page } }
      )
      .then((res) => {
        setRevenues(res.data.data);
        setLastPage(res.data.meta.last_page);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teamId, page]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRevenues(); }, [fetchRevenues, refreshVersion]);

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
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
            <p className="text-sm text-gray-500">
              {isOwner
                ? "Belum ada revenue. Catat revenue pertama untuk mulai distribusi profit."
                : "Belum ada revenue yang dicatat."}
            </p>
          </div>
        )}

        {revenues.map((r) => (
          <RevenueCard key={r.id} revenue={r} isOwner={isOwner} onDistributed={fetchRevenues} />
        ))}

        {loading && page === 1 ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
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
          <Pagination current={page} last={lastPage} onChange={setPage} />
        </div>
      )}

      <CreateRevenueForm
        teamId={teamId}
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
