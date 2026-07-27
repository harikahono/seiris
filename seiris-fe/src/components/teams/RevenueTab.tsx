import { useState, useEffect, useCallback, useRef } from "react";

import { useOutletContext } from "react-router-dom";
import api from "@/api/axios";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounceValue } from "@/hooks/useDebounceValue";
import type { Revenue } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import ProjectSelector from "@/components/teams/ProjectSelector";
import { Loader2, Plus, TrendingUp, Search, X } from "lucide-react";
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
  const pageRef = useRef(page);
  pageRef.current = page;
  const [lastPage, setLastPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [equitySlices, setEquitySlices] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const debouncedSearch = useDebounceValue(search, 300);

  // ── Fetch Revenues (no loading state — caller manages it) ──
  // ponytail: overridePage param biar gak perlu nunggu setPage propagate
  const fetchRevenues = useCallback((overridePage?: number) => {
    const p = overridePage ?? pageRef.current;
    const params: Record<string, unknown> = { page: p };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return api
      .get<{ data: Revenue[]; meta: { current_page: number; last_page: number; total: number } }>(
        `${basePath}/revenues`,
        { params }
      )
      .then((res) => {
        setRevenues(res.data.data);
        setLastPage(res.data.meta.last_page);
      })
      .catch(() => toast.error("Gagal memuat revenue"));
  }, [basePath, debouncedSearch, dateFrom, dateTo]); // ponytail: sengaja gak include page — dipake via overridePage

  // ── Fetch equity total_slices untuk scope ini (disable tombol distribusi kalau 0) ──
  const fetchEquity = useCallback(() => {
    return api
      .get<{ data: { total_slices: number } }>(`${basePath}/equity`)
      .then((res) => setEquitySlices(res.data.data.total_slices ?? 0))
      .catch(() => setEquitySlices(null));
  }, [basePath]);

  // Track basePath changes (project switch) untuk reset page
  const prevBasePath = useRef(basePath);

  // Initial load + page/scope/search/date change → fetch
  useEffect(() => {
    setRevenues([]);
    setEquitySlices(null);
    setLoading(true);
    const isNewScope = prevBasePath.current !== basePath;
    prevBasePath.current = basePath;
    if (isNewScope) setPage(1);
    const targetPage = isNewScope ? 1 : page;
    Promise.all([fetchRevenues(targetPage), fetchEquity()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, page, debouncedSearch, dateFrom, dateTo]);

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

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="animate-fade-in-up mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Revenue</h1>
        <p className="mt-1 text-sm text-gray-500">Catat pendapatan dan distribusi profit</p>
        <div className="mt-4 h-px bg-gradient-to-r from-gray-800 to-transparent" />
      </div>

      {/* ── Toolbar: scope + search + date + button ── */}
      <div className="flex flex-wrap items-center gap-2">
        <ProjectSelector inline isOwner={isOwner} />
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari deskripsi atau pencatat..."
            className="h-9 w-full rounded-md border border-gray-700 bg-gray-900 pl-8 pr-8 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white" aria-label="Hapus pencarian" title="Hapus pencarian">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); setLoading(true); }}
          className="h-9 rounded-md border border-gray-700 bg-gray-900 px-2 text-sm text-white outline-none focus:border-accent [color-scheme:dark]"
          title="Dari tanggal"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); setLoading(true); }}
          className="h-9 rounded-md border border-gray-700 bg-gray-900 px-2 text-sm text-white outline-none focus:border-accent [color-scheme:dark]"
          title="Sampai tanggal"
        />
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={team.members_count < 2}
            title={team.members_count < 2 ? "Minimal 2 anggota tim aktif" : undefined}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]"
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
