import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/api/axios";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import type { Revenue } from "@/types";
import { formatRp } from "@/lib/constants";
import ProofPreviewModal from "@/components/ui/ProofPreviewModal";
import RevenueStatusBadge from "@/components/ui/RevenueStatusBadge";
import { ArrowLeft, FileText, RefreshCw } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";

export default function RevenueDetailPage() {
  const { teamId = "", revenueId = "" } = useParams<{ teamId: string; revenueId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectContext();
  const { refreshVersion } = useRealtime();

  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showProof, setShowProof] = useState(false);

  // Initial load
  useEffect(() => {
    let active = true;
    setInitialLoading(true);
    setNotFound(false);
    api
      .get<{ data: Revenue }>(`/teams/${teamId}/revenues/${revenueId}`)
      .then((res) => {
        if (active) setRevenue(res.data.data);
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setInitialLoading(false);
      });
    return () => {
      active = false;
    };
  }, [teamId, revenueId]);

  // Background refresh from Pusher — no skeleton
  const prevRefresh = useRef(0);
  const activeRef = useRef(true);
  useEffect(() => {
    if (prevRefresh.current === 0) { prevRefresh.current = refreshVersion; return; }
    prevRefresh.current = refreshVersion;
    if (!activeRef.current) return;
    setRefreshing(true);
    api
      .get<{ data: Revenue }>(`/teams/${teamId}/revenues/${revenueId}`)
      .then((res) => { if (activeRef.current) setRevenue(res.data.data); })
      .catch(() => { if (activeRef.current) setNotFound(true); })
      .finally(() => { if (activeRef.current) setRefreshing(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  // Cleanup
  useEffect(() => { return () => { activeRef.current = false; }; }, []);

  const projectName = revenue?.project_id
    ? projects.find((p) => p.id === revenue.project_id)?.name ?? null
    : null;

  if (initialLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 px-6 pt-10 pb-8">
        <Skeleton className="h-4 w-16" />
        <div className="rounded-xl border border-gray-800/50 bg-card p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-32 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors"
          aria-label="Kembali" title="Kembali"
        >
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Kembali</span>
        </button>
        <p className="text-red-400">Revenue tidak ditemukan.</p>
      </div>
    );
  }

  const r = revenue!;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-6 pt-10 pb-8">
      <div className="animate-fade-in-up flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors"
          aria-label="Kembali" title="Kembali"
        >
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Kembali</span>
        </button>
        {refreshing && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <RefreshCw className="size-3 animate-spin" />
            Memperbarui...
          </span>
        )}
      </div>

      {/* ── Revenue Detail ── */}
      <div className="animate-fade-in-up rounded-xl border border-gray-800 bg-card p-6 transition-colors duration-200 hover:border-gray-700">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white">{r.description}</h1>
            <p className="text-xs text-gray-500">
              Dicatat oleh {r.recorded_by?.user?.name ?? "-"} &middot;{" "}
              {new Date(r.revenue_date).toLocaleDateString("id-ID")}
            </p>
          </div>
          <RevenueStatusBadge status={r.status ?? (r.is_distributed ? "distributed" : "pending")} />
        </div>

        <div className="flex flex-wrap gap-6">
          <Stat label="Pendapatan" value={formatRp(r.amount)} />
          <Stat label="Distribusi" value={formatRp(r.distributable_amount)} />
          <Stat label="Scope" value={projectName ?? "Tim (Induk)"} />
          <Stat label="Tanggal" value={r.revenue_date} />
          <Stat label="Pencatat" value={r.recorded_by?.user?.name ?? "-"} />
          <Stat label="Distribusikan ke" value={r.distributions.length ? `${r.distributions.length} anggota` : "Belum ada"} />
        </div>

        {r.deductions.length > 0 && (
          <div className="mt-5 rounded-xl border border-gray-700/50 bg-gray-900/50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Potongan</p>
            <div className="space-y-1.5 text-sm">
              {r.deductions.map((d, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-500">{d.for}</span>
                  <span className="font-mono text-gray-300">-{formatRp(d.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Bukti Transaksi</p>
            <p className="text-xs text-gray-500">{r.proof_url ? "Lampiran tersedia" : "Tidak ada bukti"}</p>
          </div>
          {r.proof_url && (
            <button
              onClick={() => setShowProof(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-4 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/10 hover:border-accent"
            >
              <FileText className="size-4" />
              Lihat Bukti
            </button>
          )}
        </div>
      </div>

      {/* ── Distributions ── */}
      {r.distributions.length > 0 && (
        <div className="animate-fade-in-up rounded-xl border border-gray-800 bg-card p-5" style={{ animationDelay: "80ms" }}>
          <h3 className="mb-3 text-sm font-semibold text-white">Daftar Distribusi</h3>
          <div className="space-y-2">
            {r.distributions.map((d) => (
              <div
                key={d.member.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2.5 transition-colors hover:border-gray-700"
              >
                <span className="text-sm text-white">{d.member.user?.name ?? "Anggota"}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">{d.equity_pct.toFixed(1)}%</span>
                  <span className="font-mono text-sm font-medium text-white">{formatRp(d.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {r.proof_url && (
        <ProofPreviewModal open={showProof} onClose={() => setShowProof(false)} url={r.proof_url} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[120px] rounded-lg border border-gray-800 bg-gray-950/50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-medium text-white" title={value}>{value}</p>
    </div>
  );
}
