import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/api/axios";
import type { AuditLogItem } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { cn } from "@/lib/utils";
import { Loader2, FileText, ThumbsUp, PieChart, TrendingUp, Gift, Users, Settings, ClipboardList } from "lucide-react";
import AuditLogEntry from "@/components/ui/AuditLogEntry";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

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
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teamId, page, filter]);

   
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Audit Log</h2>
        <span className="text-xs text-gray-500">{total} log</span>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-800 bg-card/50 p-1">
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
                  ? "bg-accent text-black"
                  : "text-gray-400 hover:text-white"
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

      <div className="space-y-3">
        {logs.map((log) => (
          <AuditLogEntry key={log.id} log={log} teamId={teamId} />
        ))}
        {loading && page === 1 && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
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
