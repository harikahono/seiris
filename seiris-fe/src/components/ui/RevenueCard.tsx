import { useState } from "react";
import { isAxiosError } from "axios";
import api from "@/api/axios";
import type { Revenue } from "@/types";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, Info, Loader2, ExternalLink,
  SendHorizontal, UserCheck,
} from "lucide-react";
import { formatRp } from "@/lib/constants";
import ConfirmModal from "@/components/ui/ConfirmModal";

// ── Status badge helper ──────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "distributed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
          <CheckCircle2 className="size-3" />
          Didistribusikan
        </span>
      );
    case "distribute_requested":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
          <UserCheck className="size-3" />
          Menunggu Persetujuan
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
          <Clock className="size-3" />
          Belum
        </span>
      );
  }
}

// ── Distribution table ───────────────────────────────────────
function DistributionTable({ revenue }: { revenue: Revenue }) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="text-xs text-accent hover:underline transition"
      >
        {showBreakdown ? "Sembunyikan" : "Lihat"} rincian pembagian
      </button>

      {showBreakdown && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-800 bg-gray-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-medium">Anggota</th>
                <th className="px-3 py-2 text-right font-medium">Equity %</th>
                <th className="px-3 py-2 text-right font-medium">Diterima</th>
              </tr>
            </thead>
            <tbody>
              {revenue.distributions.map((d) => (
                <tr key={d.member.id} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-accent/20 text-[9px] font-bold text-accent">
                        {d.member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-300">{d.member.user.name}</span>
                      {d.member.role === "owner" && (
                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                          Owner
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-400">{d.equity_pct.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right tabular-nums text-white">{formatRp(d.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-800">
                <td className="px-3 py-2 text-xs font-medium text-gray-500">Total</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right text-sm font-semibold text-white">
                  {formatRp(revenue.distributions.reduce((sum, d) => sum + d.amount, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────
interface RevenueCardProps {
  revenue: Revenue;
  isOwner: boolean;
  hasEquity?: boolean | null;
  isProjectMember?: boolean | null;
  onDistributed: () => void;
}

export default function RevenueCard({ revenue, isOwner, hasEquity, isProjectMember, onDistributed }: RevenueCardProps) {
  const [distributing, setDistributing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"distribute" | "request" | null>(null);

  const status = revenue.status ?? (revenue.is_distributed ? "distributed" : "pending");
  const noEquity = hasEquity === false;
  const notProjectMember = isProjectMember === false;
  const equityHint = (
    <span
      className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-xs text-gray-500"
      title="Butuh minimal 1 kontribusi yang diapprove"
    >
      <Info className="size-4" />
      Belum ada equity
    </span>
  );
  const projectHint = (
    <span
      className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-xs text-gray-500"
      title="Hanya anggota project yang bisa mengajukan distribusi"
    >
      <Info className="size-4" />
      Bukan anggota project ini
    </span>
  );

  const handleDistribute = async () => {
    setDistributing(true);
    try {
      const url = `/revenues/${revenue.id}/distribute`;
      await api.post(url);
      toast.success(`Profit ${formatRp(revenue.distributable_amount)} berhasil didistribusikan`);
      onDistributed();
      setConfirmAction(null);
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        toast.error(err.response.data?.message || "Gagal mendistribusikan profit");
      } else {
        toast.error("Gagal mendistribusikan profit");
      }
    } finally {
      setDistributing(false);
    }
  };

  const handleRequestDistribute = async () => {
    setDistributing(true);
    try {
      const url = `/revenues/${revenue.id}/request-distribute`;
      await api.post(url);
      toast.success(`Permintaan distribusi "${revenue.description}" diajukan`);
      onDistributed();
      setConfirmAction(null);
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        toast.error(err.response.data?.message || "Gagal mengajukan distribusi");
      } else {
        toast.error("Gagal mengajukan distribusi");
      }
    } finally {
      setDistributing(false);
    }
  };

  const renderAction = () => {
    // Owner + pending → distribusikan langsung
    if (isOwner && status === "pending") {
      if (noEquity) return equityHint;
      return (
        <button
          type="button"
          onClick={() => setConfirmAction("distribute")}
          disabled={distributing}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {distributing ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
          {distributing ? "Mendistribusikan..." : "Distribusikan"}
        </button>
      );
    }

    // Owner + distribute_requested → setujui + distribusikan
    if (isOwner && status === "distribute_requested") {
      if (noEquity) return equityHint;
      return (
        <button
          type="button"
          onClick={() => setConfirmAction("distribute")}
          disabled={distributing}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {distributing ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
          {distributing ? "Mendistribusikan..." : "Setujui & Distribusikan"}
        </button>
      );
    }

    // Non-owner + pending → ajukan distribusi
    if (!isOwner && status === "pending") {
      if (notProjectMember) return projectHint;
      if (noEquity) return equityHint;
      return (
        <button
          type="button"
          onClick={() => setConfirmAction("request")}
          disabled={distributing}
          className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-300 transition-all duration-200 hover:border-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {distributing ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
          {distributing ? "Mengajukan..." : "Ajukan Distribusi"}
        </button>
      );
    }

    // Non-owner + distribute_requested → menunggu
    if (!isOwner && status === "distribute_requested") {
      return (
        <span className="flex items-center gap-1.5 rounded-lg border border-blue-800/50 bg-blue-900/20 px-3 py-2 text-xs text-blue-400">
          <UserCheck className="size-4" />
          Menunggu persetujuan owner
        </span>
      );
    }

    return null;
  };

  return (
    <div className="group rounded-xl border border-gray-700/40 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-all duration-200 hover:border-gray-600/60 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold tabular-nums text-white">{formatRp(revenue.amount)}</p>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-gray-400 leading-relaxed">{revenue.description}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {revenue.proof_url && (
            <a
              href={revenue.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <ExternalLink className="size-3" />
              Bukti
            </a>
          )}
          <div className="text-right">
            <p className="text-[11px] text-gray-600">Siap dibagi</p>
            <p className="text-base font-semibold tabular-nums text-accent">{formatRp(revenue.distributable_amount)}</p>
          </div>
        </div>
      </div>

      {revenue.deductions && revenue.deductions.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-800/60 bg-black/20 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2">Potongan</p>
          <div className="space-y-1">
            {revenue.deductions.map((d, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-500">{d.for}</span>
                <span className="font-mono tabular-nums text-gray-400">-{formatRp(d.amount)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-800/60 pt-2 text-xs">
            <span className="font-medium text-gray-500">Siap Dibagi</span>
            <span className="font-mono font-bold tabular-nums text-accent">{formatRp(revenue.distributable_amount)}</span>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
          <span>{new Date(revenue.revenue_date).toLocaleDateString("id-ID")}</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">Dicatat oleh {revenue.recorded_by.user.name}</span>
        </div>

        {status !== "distributed" && renderAction()}
      </div>

      {status === "distributed" && <DistributionTable revenue={revenue} />}

      <ConfirmModal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmAction === "distribute" ? handleDistribute : handleRequestDistribute}
        title={confirmAction === "distribute" ? "Distribusikan Profit" : "Ajukan Distribusi"}
        description={
          confirmAction === "distribute"
            ? "Yakin ingin mendistribusikan profit ini ke semua anggota sesuai equity?"
            : "Ajukan distribusi profit ini ke owner untuk disetujui?"
        }
        confirmText={confirmAction === "distribute" ? "Distribusikan" : "Ajukan"}
        loading={distributing}
        variant="primary"
      />
    </div>
  );
}