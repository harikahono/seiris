import { useState } from "react";
import { isAxiosError } from "axios";
import api from "@/api/axios";
import type { Revenue } from "@/types";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, Loader2, ExternalLink,
  SendHorizontal, UserCheck,
} from "lucide-react";
import { formatRp } from "@/lib/constants";

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
  onDistributed: () => void;
}

export default function RevenueCard({ revenue, isOwner, onDistributed }: RevenueCardProps) {
  const [distributing, setDistributing] = useState(false);

  const status = revenue.status ?? (revenue.is_distributed ? "distributed" : "pending");

  const handleDistribute = async () => {
    if (!confirm("Yakin ingin mendistribusikan profit ini?")) return;
    setDistributing(true);
    try {
      await api.post(`/revenues/${revenue.id}/distribute`);
      toast.success("Profit berhasil didistribusikan");
      onDistributed();
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
    if (!confirm("Ajukan distribusi profit ke owner?")) return;
    setDistributing(true);
    try {
      await api.post(`/revenues/${revenue.id}/request-distribute`);
      toast.success("Permintaan distribusi diajukan");
      onDistributed();
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
      return (
        <button
          type="button"
          onClick={handleDistribute}
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
      return (
        <button
          type="button"
          onClick={handleDistribute}
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
      return (
        <button
          type="button"
          onClick={handleRequestDistribute}
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
    <div className="group rounded-xl border border-gray-800 bg-card p-5 transition-all duration-200 hover:border-gray-700 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-white">{formatRp(revenue.amount)}</p>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-gray-300">{revenue.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>Siap dibagi: <span className="text-accent font-medium">{formatRp(revenue.distributable_amount)}</span></span>
            <span className="text-gray-700">·</span>
            <span>{new Date(revenue.revenue_date).toLocaleDateString("id-ID")}</span>
            <span className="text-gray-700">·</span>
            <span>Dicatat oleh {revenue.recorded_by.user.name}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
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
        </div>
      </div>

      {revenue.deductions && revenue.deductions.length > 0 && (
        <div className="mt-3 rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1">Potongan</p>
          <div className="space-y-0.5">
            {revenue.deductions.map((d, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-400">{d.for}</span>
                <span className="font-mono text-gray-300">-{formatRp(d.amount)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-gray-800 mt-1.5 pt-1.5 text-xs">
            <span className="text-gray-500 font-medium">Siap Dibagi</span>
            <span className="font-mono text-accent font-bold">{formatRp(revenue.distributable_amount)}</span>
          </div>
        </div>
      )}

      {status === "distributed" ? (
        <DistributionTable revenue={revenue} />
      ) : (
        <div className="mt-4 flex justify-end">
          {renderAction()}
        </div>
      )}
    </div>
  );
}