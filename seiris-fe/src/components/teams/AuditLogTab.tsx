import { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/api/axios";
import { useRealtime } from "@/contexts/RealtimeContext";
import type { AuditLogItem } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { cn } from "@/lib/utils";
import { Loader2, FileText, ThumbsUp, PieChart, TrendingUp, Gift, Users, Settings, ClipboardList } from "lucide-react";
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
  const { team } = useOutletContext<TeamContext>();
  const teamId = team.id;
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params: Record<string, unknown> = { page };
    if (filter) params.filter = filter;

    api
      .get<{ data: AuditLogItem[]; meta: { current_page: number; last_page: number; total: number } }>(
        `/teams/${teamId}/audit-logs`,
        { params }
      )
      .then((res) => {
        setLogs(res.data.data);
        setLastPage(res.data.meta.last_page);
        setTotal(res.data.meta.total);
      })
      .catch(() => toast.error("Gagal memuat audit log"))
      .finally(() => setLoading(false));
  }, [teamId, page, filter]);

    
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

  const grouped = groupByDate(logs);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Audit Log</h2>
        <span className="text-xs text-gray-500">{total} log</span>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-700/20 bg-gray-900/30 p-1">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => { setFilter(f.key); setPage(1); setLogs([]); }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                filter === f.key
                  ? "bg-accent text-black shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Icon className="size-3.5" />
              {f.label}
            </button>
          );
        })}
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
              {dateLogs.map((log) => (
                <AuditLogEntry key={log.id} log={log} teamId={teamId} />
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
