import { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/api/axios";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useDebounceValue } from "@/hooks/useDebounceValue";
import type { AuditLogItem } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import ProjectSelector from "@/components/teams/ProjectSelector";
import { Loader2, FileText, ThumbsUp, PieChart, TrendingUp, Gift, Users, Settings, ClipboardList, Search, X, ChevronDown } from "lucide-react";
import AuditLogEntry from "@/components/ui/AuditLogEntry";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { toast } from "sonner";

interface FilterDef {
  key: string;
  label: string;
  icon: typeof FileText;
}

const FILTERS: FilterDef[] = [
  { key: "",       label: "Semua",     icon: FileText },
  { key: "contribution", label: "Kontribusi", icon: FileText },
  { key: "vote",   label: "Voting",    icon: ThumbsUp },
  { key: "equity", label: "Equity",    icon: PieChart },
  { key: "revenue", label: "Revenue",  icon: TrendingUp },
  { key: "profit", label: "Profit",    icon: Gift },
  { key: "member", label: "Anggota",   icon: Users },
  { key: "team",   label: "Tim",       icon: Settings },
];

function groupByDate(logs: AuditLogItem[]): Map<string, AuditLogItem[]> {
  const map = new Map<string, AuditLogItem[]>();
  for (const log of logs) {
    const date = new Date(log.created_at).toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric",
    });
    const group = map.get(date);
    if (group) group.push(log);
    else map.set(date, [log]);
  }
  return map;
}

export default function AuditLogTab() {
  const { team, isOwner } = useOutletContext<TeamContext>();
  const { currentProjectId } = useProjectContext();
  const teamId = team.id;
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  // A4: search & date range
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const debouncedSearch = useDebounceValue(search, 300);

  const activeFilterCount = (filter ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const clearFilters = () => {
    setFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setLogs([]);
  };

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params: Record<string, unknown> = { page };
    if (filter) params.filter = filter;
    if (currentProjectId) params.project_id = currentProjectId;
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    api
      .get<{ data: AuditLogItem[]; meta: { current_page: number; last_page: number; total: number } }>(
        `/teams/${teamId}/audit-logs`,
        { params }
      )
      .then((res) => {
        setLogs(res.data.data);
        setLastPage(res.data.meta.last_page);
      })
      .catch(() => toast.error("Gagal memuat audit log"))
      .finally(() => setLoading(false));
  }, [teamId, page, filter, currentProjectId, debouncedSearch, dateFrom, dateTo]);

    
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Realtime: refresh on Pusher event ──
  const { refreshVersion } = useRealtime();
  const prevRefresh = useRef(0);
  useEffect(() => {
    if (prevRefresh.current === 0) { prevRefresh.current = refreshVersion; return; }
    prevRefresh.current = refreshVersion;
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  // ── Reset ke page 1 saat scope project berubah ──
  useEffect(() => { setPage(1); }, [currentProjectId]);

  const grouped = groupByDate(logs);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="animate-fade-in-up mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Riwayat Aktivitas</h1>
        <p className="mt-1 text-sm text-gray-500">Catatan perubahan dan aktivitas tim</p>
        <div className="mt-4 h-px bg-gradient-to-r from-gray-800 to-transparent" />
      </div>

      {/* ── Toolbar: scope + search + filter dropdown + date ── */}
      <div className="flex flex-wrap items-center gap-2">
        <ProjectSelector inline isOwner={isOwner} />
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari aksi atau deskripsi..."
            className="h-9 w-full rounded-md border border-gray-700 bg-gray-900 pl-8 pr-8 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white" aria-label="Hapus pencarian" title="Hapus pencarian">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter dropdown — replaces 8 pills */}
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); setLogs([]); }}
            className="appearance-none rounded-md border border-gray-700 bg-gray-900 py-1.5 pl-2 pr-7 text-xs text-white outline-none focus:border-accent"
          >
            <option value="">Semua</option>
            <option value="contribution">Kontribusi</option>
            <option value="vote">Voting</option>
            <option value="equity">Equity</option>
            <option value="revenue">Revenue</option>
            <option value="profit">Profit</option>
            <option value="member">Anggota</option>
            <option value="team">Tim</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-gray-500" />
        </div>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); setLogs([]); }}
          className="h-9 rounded-md border border-gray-700 bg-gray-900 px-2 text-sm text-white outline-none focus:border-accent [color-scheme:dark]"
          title="Dari tanggal"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); setLogs([]); }}
          className="h-9 rounded-md border border-gray-700 bg-gray-900 px-2 text-sm text-white outline-none focus:border-accent [color-scheme:dark]"
          title="Sampai tanggal"
        />

        {/* Clear button — muncul kalo ada filter aktif */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {logs.length === 0 && !loading && (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada log"
          description={filter ? `Tidak ada log untuk filter "${FILTERS.find(f => f.key === filter)?.label ?? filter}".` : "Belum ada aktivitas yang tercatat."}
        />
      )}

      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([date, dateLogs]) => (
          <div key={date}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-600">
              {date}
            </h3>
            <div className="space-y-1">
              {dateLogs.map((log, j) => (
                <div key={log.id} className="stagger-enter" style={{ animationDelay: `${j * 30}ms` }}>
                  <AuditLogEntry log={log} teamId={teamId} />
                </div>
              ))}
            </div>
          </div>
        ))}
        {loading && page === 1 && (
          <div className="space-y-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-3">
                <Skeleton className="size-4 shrink-0 mt-0.5 rounded-full" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
                <Skeleton className="h-3 w-16 shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        )}
        {loading && page > 1 && (
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
    </div>
  );
}
